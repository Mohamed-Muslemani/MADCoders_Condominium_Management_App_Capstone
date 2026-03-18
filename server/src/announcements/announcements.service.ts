import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

const safeAnnouncementSelect = {
  announcementId: true,
  title: true,
  content: true,
  pinned: true,
  status: true,
  publishedAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
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
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    activeOnly?: boolean,
    skip?: number,
    take?: number,
  ) {
    const where: Prisma.AnnouncementWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (activeOnly) {
      where.status = 'PUBLISHED';
      where.publishedAt = { lte: new Date() };
    }

    return this.prisma.announcement.findMany({
      where,
      select: safeAnnouncementSelect,
      orderBy: [{ createdAt: 'desc' }, { announcementId: 'desc' }],
      skip,
      take,
    });
  }

  async findOne(announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { announcementId },
      select: safeAnnouncementSelect,
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async create(createdByUserId: string, dto: CreateAnnouncementDto) {
    try {
      return await this.prisma.announcement.create({
        data: {
          title: dto.title,
          content: dto.content,
          pinned: dto.pinned ?? false,
          status: dto.status,
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
          createdByUserId,
        },
        select: safeAnnouncementSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(announcementId: string, dto: UpdateAnnouncementDto) {
    try {
      const data: Prisma.AnnouncementUpdateInput = {
        title: dto.title,
        content: dto.content,
        pinned: dto.pinned,
        status: dto.status,
        publishedAt:
          dto.publishedAt === undefined
            ? undefined
            : dto.publishedAt === null
              ? null
              : new Date(dto.publishedAt),
        updatedAt: new Date(),
      };

      return await this.prisma.announcement.update({
        where: { announcementId },
        data,
        select: safeAnnouncementSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(announcementId: string) {
    try {
      await this.prisma.announcement.delete({ where: { announcementId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Announcement not found');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid relation data');
      }

      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate announcement data');
      }
    }

    throw error;
  }
}
