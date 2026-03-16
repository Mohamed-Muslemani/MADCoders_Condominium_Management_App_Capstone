import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitDueDto } from './dto/create-unit-due.dto';
import { UpdateUnitDueDto } from './dto/update-unit-due.dto';

const safeUnitDueSelect = {
  dueId: true,
  unitId: true,
  periodMonth: true,
  dueDate: true,
  paidDate: true,
  amount: true,
  status: true,
  note: true,
  emailNotifiedAt: true,
  createdAt: true,
  updatedAt: true,
  unit: {
    select: {
      unitId: true,
      unitNumber: true,
      status: true,
    },
  },
};

@Injectable()
export class UnitDuesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unitDue.findMany({
      select: safeUnitDueSelect,
      orderBy: [{ periodMonth: 'desc' }, { dueId: 'asc' }],
    });
  }

  async findOne(dueId: string) {
    const due = await this.prisma.unitDue.findUnique({
      where: { dueId },
      select: safeUnitDueSelect,
    });

    if (!due) {
      throw new NotFoundException('Unit due not found');
    }

    return due;
  }

  async findByUnit(unitId: string) {
    return this.prisma.unitDue.findMany({
      where: { unitId },
      select: safeUnitDueSelect,
      orderBy: { periodMonth: 'desc' },
    });
  }

  async create(dto: CreateUnitDueDto) {
    await this.ensureUnitExists(dto.unitId);
    this.validatePaidDate(dto.status ?? 'UNPAID', dto.paidDate);

    try {
      const status = dto.status ?? 'UNPAID';
      return await this.prisma.unitDue.create({
        data: {
          unitId: dto.unitId,
          periodMonth: new Date(dto.periodMonth),
          dueDate: new Date(dto.dueDate),
          paidDate:
            status === 'PAID'
              ? dto.paidDate
                ? new Date(dto.paidDate)
                : new Date()
              : undefined,
          amount: dto.amount,
          status,
          note: dto.notes ?? dto.note,
          emailNotifiedAt: dto.emailNotifiedAt
            ? new Date(dto.emailNotifiedAt)
            : undefined,
        },
        select: safeUnitDueSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(dueId: string, dto: UpdateUnitDueDto) {
    if (dto.unitId) {
      await this.ensureUnitExists(dto.unitId);
    }

    if (dto.status || dto.paidDate !== undefined) {
      const existing = await this.prisma.unitDue.findUnique({
        where: { dueId },
        select: { status: true },
      });

      if (!existing) {
        throw new NotFoundException('Unit due not found');
      }

      this.validatePaidDate(dto.status ?? existing.status, dto.paidDate);
    }

    try {
      const data: Prisma.UnitDueUpdateInput = {
        unit: dto.unitId ? { connect: { unitId: dto.unitId } } : undefined,
        periodMonth: dto.periodMonth ? new Date(dto.periodMonth) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount,
        status: dto.status,
        paidDate:
          dto.paidDate === undefined
            ? dto.status === 'PAID'
              ? new Date()
              : dto.status
                ? null
                : undefined
            : dto.paidDate === null
              ? null
              : new Date(dto.paidDate),
        note: dto.notes ?? dto.note,
        emailNotifiedAt:
          dto.emailNotifiedAt === undefined
            ? undefined
            : dto.emailNotifiedAt === null
              ? null
              : new Date(dto.emailNotifiedAt),
        updatedAt: new Date(),
      };

      return await this.prisma.unitDue.update({
        where: { dueId },
        data,
        select: safeUnitDueSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(dueId: string) {
    try {
      await this.prisma.unitDue.delete({ where: { dueId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async ensureUnitExists(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { unitId },
      select: { unitId: true },
    });

    if (!unit) {
      throw new BadRequestException('Invalid unitId');
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Unit due not found');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid relation data');
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A due already exists for this unit and periodMonth',
        );
      }
    }

    throw error;
  }

  private validatePaidDate(
    status: 'UNPAID' | 'PAID' | 'WAIVED',
    paidDate?: string | null,
  ) {
    if (status !== 'PAID' && paidDate) {
      throw new BadRequestException('paidDate is only allowed when status is PAID');
    }
  }
}
