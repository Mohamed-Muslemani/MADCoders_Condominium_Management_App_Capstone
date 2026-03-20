import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const safeUserSelect = {
  userId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    try {
      const hash = await bcrypt.hash(dto.password, 10);

      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: hash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
          role: dto.role,
          active: dto.active ?? true,
        },
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(userId: string, dto: UpdateUserDto) {
    try {
      const data: Prisma.UserUpdateInput = {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        active: dto.active,
      };

      if (dto.password) {
        data.passwordHash = await bcrypt.hash(dto.password, 10);
      }

      return await this.prisma.user.update({
        where: { userId },
        data,
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // Update For Owners Only 
    async updateOwnProfile(userId: string, dto: UpdateUserDto) {
    try {
      const data: Prisma.UserUpdateInput = {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      };

      if (dto.password) {
        data.passwordHash = await bcrypt.hash(dto.password, 10);
      }

      return await this.prisma.user.update({
        where: { userId },
        data,
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(userId: string) {
    try {
      await this.prisma.user.delete({
        where: { userId },
      });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Email is already in use');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
    }
    throw error;
  }
}
