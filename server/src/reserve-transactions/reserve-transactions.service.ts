import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class ReserveTransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryReserveTransactionsDto) {
    const where = this.buildWhere(query);

    return this.prisma.reserveTransaction.findMany({
      where,
      select: safeReserveTransactionSelect,
      orderBy: [{ transactionDate: 'desc' }, { expectedDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(transactionId: string) {
    const transaction = await this.prisma.reserveTransaction.findUnique({
      where: { transactionId },
      select: safeReserveTransactionSelect,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async findExpenses() {
    const today = this.startOfToday();

    return this.prisma.reserveTransaction.findMany({
      where: {
        type: 'EXPENSE',
        OR: [{ transactionDate: { lte: today } }, { expectedDate: { lte: today } }],
      },
      select: safeReserveTransactionSelect,
      orderBy: [{ transactionDate: 'desc' }, { expectedDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findProjections() {
    const today = this.startOfToday();

    return this.prisma.reserveTransaction.findMany({
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
      orderBy: [{ expectedDate: 'asc' }, { transactionDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findByCategory(categoryId: string) {
    return this.prisma.reserveTransaction.findMany({
      where: { categoryId },
      select: safeReserveTransactionSelect,
      orderBy: [{ transactionDate: 'desc' }, { expectedDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findByDateRange(dateFrom: string, dateTo: string) {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    if (new Date(dateTo) < new Date(dateFrom)) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }

    return this.prisma.reserveTransaction.findMany({
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
      orderBy: [{ transactionDate: 'desc' }, { expectedDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(createdByUserId: string, dto: CreateReserveTransactionDto) {
    this.validateDates(dto.transactionDate, dto.expectedDate);

    try {
      return await this.prisma.reserveTransaction.create({
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

      return await this.prisma.reserveTransaction.update({
        where: { transactionId },
        data,
        select: safeReserveTransactionSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(transactionId: string) {
    try {
      await this.prisma.reserveTransaction.delete({ where: { transactionId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
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

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
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
