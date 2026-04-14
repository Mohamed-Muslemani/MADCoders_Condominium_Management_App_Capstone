import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
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
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user
      .create({
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
      })
      .catch((error: any) => this.handlePrismaError(error));

    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
      return user;
    } catch {
      throw new InternalServerErrorException(
        'User account was created, but the welcome email could not be sent.',
      );
    }
  }

  async update(userId: string, dto: UpdateUserDto) {
    try {
      const data: any = {
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
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async updateOwnProfile(userId: string, dto: UpdateUserDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { userId },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      const data: any = {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      };

      if (dto.password) {
        if (!dto.currentPassword) {
          throw new BadRequestException(
            'Current password is required to set a new password.',
          );
        }

        const passwordsMatch = await bcrypt.compare(
          dto.currentPassword,
          existing.passwordHash,
        );

        if (!passwordsMatch) {
          throw new BadRequestException('Current password is incorrect.');
        }

        data.passwordHash = await bcrypt.hash(dto.password, 10);
      } else if (dto.currentPassword) {
        throw new BadRequestException(
          'New password is required when providing the current password.',
        );
      }

      return await this.prisma.user.update({
        where: { userId },
        data,
        select: safeUserSelect,
      });
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async remove(userId: string) {
    try {
      await this.prisma.user.delete({
        where: { userId },
      });

      return { deleted: true };
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002') {
      throw new BadRequestException('Email is already in use');
    }

    if (error?.code === 'P2025') {
      throw new NotFoundException('User not found');
    }

    throw error;
  }
}
