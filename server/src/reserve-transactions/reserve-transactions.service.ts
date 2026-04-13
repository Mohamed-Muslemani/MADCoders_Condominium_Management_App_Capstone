import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { extname, join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReserveTransactionDto } from './dto/create-reserve-transaction.dto';
import { QueryReserveTransactionsDto } from './dto/query-reserve-transactions.dto';
import { UpdateReserveTransactionDto } from './dto/update-reserve-transaction.dto';

const safeReserveTransactionSelect = {
  transactionId: true,
  categoryId: true,
  createdByUserId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  amount: true,
  transactionDate: true,
  expectedDate: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      categoryId: true,
      name: true,
      description: true,
    },
  },
  createdBy: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
    },
  },
};

const reserveReceiptSelect = {
  fileId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  links: {
    where: { relatedType: 'RESERVE_TRANSACTION' as const },
    select: {
      fileLinkId: true,
      relatedType: true,
      relatedId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

type AuthUser = {
  userId: string;
  role: 'ADMIN' | 'OWNER';
};

type UploadedReceiptFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ReserveTransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryReserveTransactionsDto) {
    const where = this.buildWhere(query);

    const transactions = await this.prisma.reserveTransaction.findMany({
      where,
      select: safeReserveTransactionSelect,
      orderBy: [
        { transactionDate: 'desc' },
        { expectedDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return this.attachReceipts(transactions);
  }

  async findOne(transactionId: string) {
    const transaction = await this.prisma.reserveTransaction.findUnique({
      where: { transactionId },
      select: safeReserveTransactionSelect,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const [hydrated] = await this.attachReceipts([transaction]);
    return hydrated;
  }

  async findExpenses() {
    const today = this.startOfToday();

    const transactions = await this.prisma.reserveTransaction.findMany({
      where: {
        type: 'EXPENSE',
        OR: [
          { transactionDate: { lte: today } },
          { expectedDate: { lte: today } },
        ],
      },
      select: safeReserveTransactionSelect,
      orderBy: [
        { transactionDate: 'desc' },
        { expectedDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return this.attachReceipts(transactions);
  }

  async findProjections() {
    const today = this.startOfToday();

    const transactions = await this.prisma.reserveTransaction.findMany({
      where: {
        type: 'PROJECTION',
        OR: [
          { transactionDate: { gt: today } },
          { expectedDate: { gt: today } },
          {
            transactionDate: null,
            expectedDate: null,
            status: 'PLANNED',
          },
        ],
      },
      select: safeReserveTransactionSelect,
      orderBy: [
        { expectedDate: 'asc' },
        { transactionDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return this.attachReceipts(transactions);
  }

  async findByCategory(categoryId: string) {
    const transactions = await this.prisma.reserveTransaction.findMany({
      where: { categoryId },
      select: safeReserveTransactionSelect,
      orderBy: [
        { transactionDate: 'desc' },
        { expectedDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return this.attachReceipts(transactions);
  }

  async findByDateRange(dateFrom: string, dateTo: string) {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    if (new Date(dateTo) < new Date(dateFrom)) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }

    const transactions = await this.prisma.reserveTransaction.findMany({
      where: {
        OR: [
          {
            transactionDate: {
              gte: new Date(dateFrom),
              lte: new Date(dateTo),
            },
          },
          {
            expectedDate: {
              gte: new Date(dateFrom),
              lte: new Date(dateTo),
            },
          },
        ],
      },
      select: safeReserveTransactionSelect,
      orderBy: [
        { transactionDate: 'desc' },
        { expectedDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return this.attachReceipts(transactions);
  }

  async create(createdByUserId: string, dto: CreateReserveTransactionDto) {
    this.validateDates(dto.transactionDate, dto.expectedDate);
    await this.ensureCategoryExists(dto.categoryId);

    try {
      const created = await this.prisma.reserveTransaction.create({
        data: {
          categoryId: dto.categoryId,
          createdByUserId,
          type: dto.type,
          status: dto.status,
          title: dto.title,
          description: dto.description,
          amount: dto.amount,
          transactionDate: dto.transactionDate
            ? new Date(dto.transactionDate)
            : null,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        },
        select: safeReserveTransactionSelect,
      });

      const [hydrated] = await this.attachReceipts([created]);
      return hydrated;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(transactionId: string, dto: UpdateReserveTransactionDto) {
    const existing = await this.prisma.reserveTransaction.findUnique({
      where: { transactionId },
      select: {
        transactionId: true,
        transactionDate: true,
        expectedDate: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const nextTransactionDate =
      dto.transactionDate === undefined
        ? existing.transactionDate
        : dto.transactionDate === null
          ? null
          : new Date(dto.transactionDate);

    const nextExpectedDate =
      dto.expectedDate === undefined
        ? existing.expectedDate
        : dto.expectedDate === null
          ? null
          : new Date(dto.expectedDate);

    this.validateDates(
      nextTransactionDate ? nextTransactionDate.toISOString() : undefined,
      nextExpectedDate ? nextExpectedDate.toISOString() : undefined,
    );
    await this.ensureCategoryExists(dto.categoryId ?? undefined);

    try {
      const data: Prisma.ReserveTransactionUpdateInput = {
        category:
          dto.categoryId === undefined
            ? undefined
            : dto.categoryId === null
              ? { disconnect: true }
              : { connect: { categoryId: dto.categoryId } },
        type: dto.type,
        status: dto.status,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        transactionDate:
          dto.transactionDate === undefined
            ? undefined
            : dto.transactionDate === null
              ? null
              : new Date(dto.transactionDate),
        expectedDate:
          dto.expectedDate === undefined
            ? undefined
            : dto.expectedDate === null
              ? null
              : new Date(dto.expectedDate),
        updatedAt: new Date(),
      };

      const updated = await this.prisma.reserveTransaction.update({
        where: { transactionId },
        data,
        select: safeReserveTransactionSelect,
      });

      const [hydrated] = await this.attachReceipts([updated]);
      return hydrated;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(transactionId: string) {
    await this.deleteReceiptFilesForTransaction(transactionId);

    try {
      await this.prisma.reserveTransaction.delete({ where: { transactionId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async uploadReceipt(
    authUser: AuthUser,
    transactionId: string,
    file: UploadedReceiptFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('A receipt file is required');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const transaction = await this.prisma.reserveTransaction.findUnique({
      where: { transactionId },
      select: { transactionId: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const storedFile = await this.persistReceipt(file);

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingFiles = await tx.file.findMany({
          where: {
            links: {
              some: {
                relatedType: 'RESERVE_TRANSACTION',
                relatedId: transactionId,
              },
            },
          },
          select: {
            fileId: true,
            storagePath: true,
          },
        });

        await tx.fileLink.deleteMany({
          where: {
            relatedType: 'RESERVE_TRANSACTION',
            relatedId: transactionId,
          },
        });

        if (existingFiles.length > 0) {
          await tx.file.deleteMany({
            where: {
              fileId: {
                in: existingFiles.map((currentFile) => currentFile.fileId),
              },
            },
          });
        }

        const createdFile = await tx.file.create({
          data: {
            originalName: file.originalname,
            storagePath: storedFile.storagePath,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            sha256Hash: storedFile.sha256Hash,
            uploadedByUserId: authUser.userId,
          },
          select: { fileId: true },
        });

        await tx.fileLink.create({
          data: {
            fileId: createdFile.fileId,
            relatedType: 'RESERVE_TRANSACTION',
            relatedId: transactionId,
            linkedByUserId: authUser.userId,
          },
        });

        for (const currentFile of existingFiles) {
          await this.deleteStoredFile(currentFile.storagePath);
        }
      });

      return this.findOne(transactionId);
    } catch (error) {
      await this.deleteStoredFile(storedFile.storagePath);
      throw error;
    }
  }

  async getReceiptDownload(transactionId: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        links: {
          some: {
            relatedType: 'RESERVE_TRANSACTION',
            relatedId: transactionId,
          },
        },
      },
      select: {
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        storagePath: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    if (!file) {
      throw new NotFoundException('Receipt not found');
    }

    return {
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      stream: createReadStream(file.storagePath),
    };
  }

  async removeReceipt(transactionId: string) {
    const transaction = await this.prisma.reserveTransaction.findUnique({
      where: { transactionId },
      select: { transactionId: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.deleteReceiptFilesForTransaction(transactionId);
    return this.findOne(transactionId);
  }

  private buildWhere(
    query: QueryReserveTransactionsDto,
  ): Prisma.ReserveTransactionWhereInput {
    const where: Prisma.ReserveTransactionWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      const from = query.dateFrom ? new Date(query.dateFrom) : undefined;
      const to = query.dateTo ? new Date(query.dateTo) : undefined;

      if (from && to && to < from) {
        throw new BadRequestException('dateTo must be on or after dateFrom');
      }

      where.OR = [
        {
          transactionDate: {
            gte: from,
            lte: to,
          },
        },
        {
          expectedDate: {
            gte: from,
            lte: to,
          },
        },
      ];
    }

    return where;
  }

  private validateDates(transactionDate?: string, expectedDate?: string) {
    if (!transactionDate || !expectedDate) {
      return;
    }

    if (new Date(transactionDate) > new Date(expectedDate)) {
      throw new BadRequestException(
        'transactionDate cannot be after expectedDate',
      );
    }
  }

  private async ensureCategoryExists(categoryId?: string | null) {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.expenseCategory.findUnique({
      where: { categoryId },
      select: { categoryId: true },
    });

    if (!category) {
      throw new BadRequestException('Invalid categoryId');
    }
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private async attachReceipts<
    T extends Array<{
      transactionId: string;
    }>,
  >(transactions: T) {
    if (transactions.length === 0) {
      return transactions.map((transaction) => ({
        ...transaction,
        receiptFile: null,
      })) as Array<T[number] & { receiptFile: null }>;
    }

    const receiptFiles = await this.prisma.file.findMany({
      where: {
        links: {
          some: {
            relatedType: 'RESERVE_TRANSACTION',
            relatedId: {
              in: transactions.map((transaction) => transaction.transactionId),
            },
          },
        },
      },
      select: reserveReceiptSelect,
      orderBy: [{ uploadedAt: 'desc' }, { fileId: 'desc' }],
    });

    const receiptByTransactionId = new Map<string, (typeof receiptFiles)[number]>();

    for (const file of receiptFiles) {
      const relatedId = file.links[0]?.relatedId;
      if (relatedId && !receiptByTransactionId.has(relatedId)) {
        receiptByTransactionId.set(relatedId, file);
      }
    }

    return transactions.map((transaction) => ({
      ...transaction,
      receiptFile: receiptByTransactionId.get(transaction.transactionId)
        ? this.serializeBigInt(receiptByTransactionId.get(transaction.transactionId))
        : null,
    }));
  }

  private async persistReceipt(file: UploadedReceiptFile) {
    const uploadDir = join(process.cwd(), 'storage', 'reserve-receipts');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileExt = extname(file.originalname) || '.bin';
    const fileName = `${randomUUID()}${fileExt}`;
    const storagePath = join(uploadDir, fileName);

    await fs.writeFile(storagePath, file.buffer);

    return {
      storagePath,
      sha256Hash: createHash('sha256').update(file.buffer).digest('hex'),
    };
  }

  private async deleteStoredFile(storagePath: string) {
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  }

  private async deleteReceiptFilesForTransaction(transactionId: string) {
    const files = await this.prisma.file.findMany({
      where: {
        links: {
          some: {
            relatedType: 'RESERVE_TRANSACTION',
            relatedId: transactionId,
          },
        },
      },
      select: {
        fileId: true,
        storagePath: true,
      },
    });

    if (files.length === 0) {
      return;
    }

    await this.prisma.fileLink.deleteMany({
      where: {
        relatedType: 'RESERVE_TRANSACTION',
        relatedId: transactionId,
      },
    });

    await this.prisma.file.deleteMany({
      where: {
        fileId: {
          in: files.map((file) => file.fileId),
        },
      },
    });

    await Promise.all(
      files.map((file) => this.deleteStoredFile(file.storagePath)),
    );
  }

  private serializeBigInt<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, currentValue: unknown) =>
        typeof currentValue === 'bigint' ? Number(currentValue) : currentValue,
      ),
    ) as T;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Transaction not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid relation data');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate transaction data');
      }
    }

    throw error;
  }
}
