import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

const safeUnitSelect = {
  unitId: true,
  unitNumber: true,
  unitType: true,
  floor: true,
  bedrooms: true,
  bathrooms: true,
  squareFeet: true,
  parkingSpots: true,
  monthlyFee: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({
      select: safeUnitSelect,
      orderBy: { unitNumber: 'asc' },
    });
  }

  async findOne(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { unitId },
      select: safeUnitSelect,
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async create(dto: CreateUnitDto) {
    try {
      return await this.prisma.unit.create({
        data: {
          unitNumber: dto.unitNumber,
          unitType: dto.unitType,
          floor: dto.floor,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          squareFeet: dto.squareFeet,
          parkingSpots: dto.parkingSpots,
          monthlyFee: dto.monthlyFee,
          status: dto.status,
          notes: dto.notes,
        },
        select: safeUnitSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(unitId: string, dto: UpdateUnitDto) {
    try {
      const data: Prisma.UnitUpdateInput = {
        unitNumber: dto.unitNumber,
        unitType: dto.unitType,
        floor: dto.floor,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        squareFeet: dto.squareFeet,
        parkingSpots: dto.parkingSpots,
        monthlyFee: dto.monthlyFee,
        status: dto.status,
        notes: dto.notes,
        updatedAt: new Date(),
      };

      return await this.prisma.unit.update({
        where: { unitId },
        data,
        select: safeUnitSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(unitId: string) {
    try {
      await this.prisma.unit.delete({
        where: { unitId },
      });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Unit number already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Unit not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Unit cannot be deleted while in use');
      }
    }
    throw error;
  }
}
