import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

const safeExpenseCategorySelect = {
  categoryId: true,
  name: true,
  description: true,
  createdAt: true,
  _count: {
    select: {
      transactions: true,
    },
  },
};

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.expenseCategory.findMany({
      select: safeExpenseCategorySelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(categoryId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { categoryId },
      select: safeExpenseCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return category;
  }

  async create(dto: CreateExpenseCategoryDto) {
    try {
      return await this.prisma.expenseCategory.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
        select: safeExpenseCategorySelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(categoryId: string, dto: UpdateExpenseCategoryDto) {
    await this.findOne(categoryId);

    try {
      return await this.prisma.expenseCategory.update({
        where: { categoryId },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description.trim() || null,
        },
        select: safeExpenseCategorySelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(categoryId: string) {
    await this.findOne(categoryId);

    try {
      await this.prisma.expenseCategory.delete({
        where: { categoryId },
      });

      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Expense category name already exists');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Expense category cannot be deleted while transactions still reference it',
        );
      }
    }

    throw error;
  }
}
