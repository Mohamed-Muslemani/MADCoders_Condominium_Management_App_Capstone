import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitOwnerDto } from './dto/create-unit-owner.dto';
import { UpdateUnitOwnerDto } from './dto/update-unit-owner.dto';

const safeUnitOwnerSelect = {
  unitOwnerId: true,
  unitId: true,
  userId: true,
  startDate: true,
  endDate: true,
  unit: {
    select: {
      unitId: true,
      unitNumber: true,
      status: true,
    },
  },
  user: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      active: true,
    },
  },
};

@Injectable()
export class UnitOwnersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unitOwner.findMany({
      select: safeUnitOwnerSelect,
      orderBy: [{ startDate: 'desc' }, { unitOwnerId: 'asc' }],
    });
  }

  async findOne(unitOwnerId: string) {
    const record = await this.prisma.unitOwner.findUnique({
      where: { unitOwnerId },
      select: safeUnitOwnerSelect,
    });

    if (!record) {
      throw new NotFoundException('Unit owner record not found');
    }

    return record;
  }

  async findByUnit(unitId: string) {
    return this.prisma.unitOwner.findMany({
      where: { unitId },
      select: safeUnitOwnerSelect,
      orderBy: { startDate: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.unitOwner.findMany({
      where: { userId },
      select: safeUnitOwnerSelect,
      orderBy: { startDate: 'desc' },
    });
  }

  async create(dto: CreateUnitOwnerDto) {
    this.validateDateRange(dto.startDate, dto.endDate);

    try {
      return await this.prisma.unitOwner.create({
        data: {
          unitId: dto.unitId,
          userId: dto.userId,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
        select: safeUnitOwnerSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(unitOwnerId: string, dto: UpdateUnitOwnerDto) {
    if (dto.startDate || dto.endDate) {
      const existing = await this.prisma.unitOwner.findUnique({
        where: { unitOwnerId },
      });

      if (!existing) {
        throw new NotFoundException('Unit owner record not found');
      }

      const startDate =
        dto.startDate !== undefined
          ? dto.startDate
          : existing.startDate.toISOString();
      const endDate =
        dto.endDate !== undefined
          ? dto.endDate
          : existing.endDate?.toISOString();
      this.validateDateRange(startDate, endDate);
    }

    try {
      let endDate: Date | null | undefined = undefined;
      if (dto.endDate === null) {
        endDate = null;
      } else if (dto.endDate) {
        endDate = new Date(dto.endDate);
      }

      return await this.prisma.unitOwner.update({
        where: { unitOwnerId },
        data: {
          unitId: dto.unitId,
          userId: dto.userId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate,
        },
        select: safeUnitOwnerSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(unitOwnerId: string) {
    try {
      await this.prisma.unitOwner.delete({ where: { unitOwnerId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private validateDateRange(startDate: string, endDate?: string | null) {
    if (!endDate) return;

    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Unit owner record not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid unitId or userId');
      }
    }

    throw error;
  }
}
