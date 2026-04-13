import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

type UploadedCsvFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type CsvRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type NormalizedRow = {
  rowNumber: number;
  sourceUnitId: string | null;
  unitId: string | null;
  periodMonth: Date | null;
  dueDate: Date | null;
  paidDate: Date | null;
  amount: Prisma.Decimal | null;
  status: 'UNPAID' | 'PAID' | 'WAIVED' | null;
  note: string | null;
  rowStatus: 'PENDING' | 'APPLIED' | 'FAILED';
  errorReason: string | null;
};

const batchSelect = {
  importBatchId: true,
  periodMonth: true,
  totalRows: true,
  importedAt: true,
  file: {
    select: {
      fileId: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      links: {
        select: {
          fileLinkId: true,
          relatedType: true,
          relatedId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  importedBy: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
    },
  },
  lines: {
    select: {
      importLineId: true,
      rowNumber: true,
      sourceUnitId: true,
      unitId: true,
      periodMonth: true,
      dueDate: true,
      paidDate: true,
      amount: true,
      status: true,
      note: true,
      rowStatus: true,
      errorReason: true,
      unit: {
        select: {
          unitId: true,
          unitNumber: true,
          status: true,
        },
      },
      dues: {
        select: {
          dueId: true,
          periodMonth: true,
          amount: true,
          status: true,
          dueDate: true,
          paidDate: true,
          note: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
      },
    },
    orderBy: { rowNumber: 'asc' as const },
  },
};

const batchListSelect = {
  importBatchId: true,
  periodMonth: true,
  totalRows: true,
  importedAt: true,
  file: {
    select: {
      fileId: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
    },
  },
  importedBy: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
    },
  },
  lines: {
    select: {
      rowStatus: true,
    },
  },
};

@Injectable()
export class DuesImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const batches = await this.prisma.duesImportBatch.findMany({
      select: batchListSelect,
      orderBy: { importedAt: 'desc' },
    });

    return batches.map((batch) => this.serializeBatch(batch));
  }

  async findOne(importBatchId: string) {
    const batch = await this.prisma.duesImportBatch.findUnique({
      where: { importBatchId },
      select: batchSelect,
    });

    if (!batch) {
      throw new NotFoundException('Dues import batch not found');
    }

    return this.serializeBatch(batch);
  }

  async importCsv(importedByUserId: string, file: UploadedCsvFile | undefined) {
    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded CSV file is empty');
    }

    const csvRows = this.parseCsv(file.buffer.toString('utf-8'));

    if (csvRows.length === 0) {
      throw new BadRequestException(
        'CSV file must contain at least one data row',
      );
    }

    const batchPeriodMonth = this.resolveBatchPeriodMonth(csvRows);
    const storedFile = await this.persistFile(file);
    let importBatchId: string | null = null;

    try {
      const batch = await this.prisma.duesImportBatch.create({
        data: {
          file: {
            create: {
              originalName: file.originalname,
              storagePath: storedFile.storagePath,
              mimeType: file.mimetype,
              sizeBytes: BigInt(file.size),
              sha256Hash: storedFile.sha256Hash,
              uploadedByUserId: importedByUserId,
            },
          },
          importedBy: {
            connect: { userId: importedByUserId },
          },
          periodMonth: batchPeriodMonth,
          totalRows: csvRows.length,
        },
        select: {
          importBatchId: true,
          fileId: true,
        },
      });
      importBatchId = batch.importBatchId;

      await this.prisma.fileLink.create({
        data: {
          fileId: batch.fileId,
          relatedType: 'DUES_IMPORT_BATCH',
          relatedId: batch.importBatchId,
          linkedByUserId: importedByUserId,
        },
      });

      for (const row of csvRows) {
        await this.processRow(
          batch.importBatchId,
          importedByUserId,
          row,
          batchPeriodMonth,
        );
      }

      return this.findOne(batch.importBatchId);
    } catch (error) {
      if (!importBatchId) {
        await this.deleteStoredFile(storedFile.storagePath);
      }
      throw error;
    }
  }

  private async processRow(
    importBatchId: string,
    importedByUserId: string,
    row: CsvRow,
    batchPeriodMonth: Date,
  ) {
    const normalized = await this.normalizeRow(row, batchPeriodMonth);

    if (normalized.rowStatus === 'FAILED') {
      await this.prisma.duesImportLine.create({
        data: {
          importBatchId,
          rowNumber: normalized.rowNumber,
          sourceUnitId: normalized.sourceUnitId,
          unitId: normalized.unitId,
          periodMonth: normalized.periodMonth,
          dueDate: normalized.dueDate,
          paidDate: normalized.paidDate,
          amount: normalized.amount,
          status: normalized.status,
          note: normalized.note,
          rowStatus: 'FAILED',
          errorReason: normalized.errorReason,
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const line = await tx.duesImportLine.create({
        data: {
          importBatchId,
          rowNumber: normalized.rowNumber,
          sourceUnitId: normalized.sourceUnitId,
          unitId: normalized.unitId,
          periodMonth: normalized.periodMonth,
          dueDate: normalized.dueDate,
          paidDate: normalized.paidDate,
          amount: normalized.amount,
          status: normalized.status,
          note: normalized.note,
          rowStatus: 'APPLIED',
          errorReason: null,
        },
        select: {
          importLineId: true,
        },
      });

      await tx.unitDue.upsert({
        where: {
          unitId_periodMonth: {
            unitId: normalized.unitId,
            periodMonth: normalized.periodMonth,
          },
        },
        create: {
          unitId: normalized.unitId,
          periodMonth: normalized.periodMonth,
          dueDate: normalized.dueDate,
          paidDate: normalized.paidDate,
          amount: normalized.amount,
          status: normalized.status,
          note: normalized.note,
          importBatchId,
          importLineId: line.importLineId,
          updatedByUserId: importedByUserId,
          updatedAt: new Date(),
        },
        update: {
          dueDate: normalized.dueDate,
          paidDate: normalized.paidDate,
          amount: normalized.amount,
          status: normalized.status,
          note: normalized.note,
          importBatchId,
          importLineId: line.importLineId,
          updatedByUserId: importedByUserId,
          updatedAt: new Date(),
        },
      });
    });
  }

  private async normalizeRow(
    row: CsvRow,
    batchPeriodMonth: Date,
  ): Promise<NormalizedRow> {
    const sourceUnitId = this.readValue(row.values, 'unit_id');
    const sourceUnitNumber = this.readValue(row.values, 'unit_number');
    const rawPeriodMonth = this.readValue(row.values, 'period_month');
    const rawDueDate = this.readValue(row.values, 'due_date');
    const rawPaidDate = this.readValue(row.values, 'paid_date');
    const rawAmount = this.readValue(row.values, 'amount');
    const rawStatus = this.readValue(row.values, 'status');
    const rawNote = this.readValue(row.values, 'note');

    const note = rawNote || null;
    const errors: string[] = [];

    const periodMonth = rawPeriodMonth ? this.parseMonth(rawPeriodMonth) : null;
    if (!periodMonth) {
      errors.push(
        'period_month is required and must be in YYYY-MM or YYYY-MM-DD format',
      );
    } else if (periodMonth.getTime() !== batchPeriodMonth.getTime()) {
      errors.push('period_month must match the batch period');
    }

    const dueDate = rawDueDate ? this.parseDate(rawDueDate) : null;
    if (!dueDate) {
      errors.push('due_date is required and must be in YYYY-MM-DD format');
    }

    const amount = rawAmount ? this.parseAmount(rawAmount) : null;
    if (!amount) {
      errors.push('amount is required and must be a positive number');
    }

    const status = rawStatus ? this.parseDueStatus(rawStatus) : 'UNPAID';
    if (!status) {
      errors.push('status must be UNPAID, PAID, or WAIVED when provided');
    }

    const paidDate = rawPaidDate ? this.parseDate(rawPaidDate) : null;
    if (rawPaidDate && !paidDate) {
      errors.push('paid_date must be in YYYY-MM-DD format when provided');
    }
    if (paidDate && status !== 'PAID') {
      errors.push('paid_date is only allowed when status is PAID');
    }

    let unitId: string | null = null;
    const sourceUnitIdentifier = sourceUnitId || sourceUnitNumber;

    if (!sourceUnitIdentifier) {
      errors.push('unit_id or unit_number is required');
    } else {
      const unit = sourceUnitId
        ? await this.prisma.unit.findUnique({
            where: { unitId: sourceUnitId },
            select: { unitId: true },
          })
        : await this.prisma.unit.findFirst({
            where: { unitNumber: sourceUnitNumber },
            select: { unitId: true },
          });

      if (!unit) {
        errors.push(
          sourceUnitId
            ? 'unit_id does not match an existing unit'
            : 'unit_number does not match an existing unit',
        );
      } else {
        unitId = unit.unitId;
      }
    }

    if (errors.length > 0) {
      return {
        rowNumber: row.rowNumber,
        sourceUnitId: sourceUnitIdentifier || null,
        unitId,
        periodMonth,
        dueDate,
        paidDate,
        amount,
        status,
        note,
        rowStatus: 'FAILED',
        errorReason: errors.join('; '),
      };
    }

    return {
      rowNumber: row.rowNumber,
      sourceUnitId: sourceUnitIdentifier,
      unitId,
      periodMonth,
      dueDate,
      paidDate,
      amount,
      status,
      note,
      rowStatus: 'APPLIED',
      errorReason: null,
    };
  }

  private resolveBatchPeriodMonth(rows: CsvRow[]) {
    const distinctMonths = new Set(
      rows
        .map((row) => this.readValue(row.values, 'period_month'))
        .filter((value): value is string => Boolean(value))
        .map((value) => this.parseMonth(value))
        .filter((value): value is Date => Boolean(value))
        .map((value) => value.toISOString().slice(0, 10)),
    );

    if (distinctMonths.size === 0) {
      throw new BadRequestException(
        'CSV must include a valid period_month column for all rows',
      );
    }

    if (distinctMonths.size > 1) {
      throw new BadRequestException(
        'All rows in a dues import batch must share the same period_month',
      );
    }

    return new Date(`${Array.from(distinctMonths)[0]}T00:00:00.000Z`);
  }

  private serializeBatch<
    T extends {
      totalRows: number;
      lines: Array<{ rowStatus: 'APPLIED' | 'FAILED' | 'PENDING' }>;
    },
  >(batch: T) {
    const successCount = batch.lines.filter(
      (line) => line.rowStatus === 'APPLIED',
    ).length;
    const failedCount = batch.lines.filter(
      (line) => line.rowStatus === 'FAILED',
    ).length;

    const batchStatus =
      failedCount === 0 ? 'APPLIED' : successCount === 0 ? 'FAILED' : 'PARTIAL';

    const serialized = JSON.parse(
      JSON.stringify(batch, (_, value: unknown) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    ) as typeof batch;

    return {
      ...serialized,
      summary: {
        totalRows: batch.totalRows,
        successCount,
        failedCount,
        batchStatus,
      },
    } as typeof serialized & {
      summary: {
        totalRows: number;
        successCount: number;
        failedCount: number;
        batchStatus: 'APPLIED' | 'FAILED' | 'PARTIAL';
      };
    };
  }

  private parseCsv(content: string) {
    const rows = this.tokenizeCsv(content);

    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((value) => this.normalizeHeader(value));
    const requiredHeaders = ['period_month', 'amount', 'due_date'];

    if (!headers.includes('unit_id') && !headers.includes('unit_number')) {
      throw new BadRequestException(
        'CSV is missing required column: unit_id or unit_number',
      );
    }

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new BadRequestException(
          `CSV is missing required column: ${header}`,
        );
      }
    }

    return rows
      .slice(1)
      .map((values, index) => ({
        rowNumber: index + 2,
        values: headers.reduce<Record<string, string>>(
          (acc, header, headerIndex) => {
            acc[header] = (values[headerIndex] ?? '').trim();
            return acc;
          },
          {},
        ),
      }))
      .filter((row) =>
        Object.values(row.values).some((value) => value.trim().length > 0),
      );
  }

  private tokenizeCsv(content: string) {
    const text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const nextChar = text[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
        continue;
      }

      if (char === '\n' && !inQuotes) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        continue;
      }

      currentField += char;
    }

    currentRow.push(currentField);
    rows.push(currentRow);

    return rows;
  }

  private normalizeHeader(value: string) {
    return value.trim().toLowerCase();
  }

  private readValue(values: Record<string, string>, key: string) {
    const value = values[key];
    return value?.trim() || '';
  }

  private parseMonth(value: string) {
    const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value.trim());
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, 1));
  }

  private parseDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  private parseAmount(value: string) {
    const amount = Number(value.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return new Prisma.Decimal(amount.toFixed(2));
  }

  private parseDueStatus(value: string) {
    const normalized = value.trim().toUpperCase();
    return ['UNPAID', 'PAID', 'WAIVED'].includes(normalized)
      ? (normalized as 'UNPAID' | 'PAID' | 'WAIVED')
      : null;
  }

  private async persistFile(file: UploadedCsvFile) {
    const uploadDir = join(process.cwd(), 'storage', 'dues-imports');
    await fs.mkdir(uploadDir, { recursive: true });

    const extension = extname(file.originalname) || '.csv';
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const storagePath = join(uploadDir, filename);
    const sha256Hash = createHash('sha256').update(file.buffer).digest('hex');

    await fs.writeFile(storagePath, file.buffer);

    return {
      storagePath,
      sha256Hash,
    };
  }

  private async deleteStoredFile(storagePath: string) {
    try {
      await fs.unlink(storagePath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}
