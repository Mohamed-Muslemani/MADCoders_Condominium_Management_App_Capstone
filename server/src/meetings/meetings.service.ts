import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.meeting.findMany({
      orderBy: { meetingDate: 'desc' },
    });
  }

  async findOne(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async create(dto: CreateMeetingDto) {
    return this.prisma.meeting.create({
      data: {
        meetingDate: new Date(dto.meetingDate),
        title: dto.title,
        notes: dto.notes,
      },
    });
  }

  async update(meetingId: string, dto: UpdateMeetingDto) {
    const existing = await this.prisma.meeting.findUnique({
      where: { meetingId },
    });

    if (!existing) {
      throw new NotFoundException('Meeting not found');
    }

    return this.prisma.meeting.update({
      where: { meetingId },
      data: {
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : undefined,
        title: dto.title,
        notes: dto.notes,
      },
    });
  }

  async remove(meetingId: string) {
    const existing = await this.prisma.meeting.findUnique({
      where: { meetingId },
    });

    if (!existing) {
      throw new NotFoundException('Meeting not found');
    }

    await this.prisma.meeting.delete({
      where: { meetingId },
    });

    return { deleted: true };
  }
}