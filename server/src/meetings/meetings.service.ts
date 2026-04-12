import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import {
  DocumentType,
  DocumentVisibility,
} from '../documents/dto/create-document.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

type UploadedPdfFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const safeMeetingSelect = {
  meetingId: true,
  meetingDate: true,
  title: true,
  notes: true,
  createdAt: true,
};

const safeMeetingMinutesSelect = {
  meetingMinutesId: true,
  createdAt: true,
  document: {
    select: {
      documentId: true,
      title: true,
      docType: true,
      visibility: true,
      description: true,
      versions: {
        select: {
          versionId: true,
          versionNumber: true,
          isCurrent: true,
          indexStatus: true,
          uploadedAt: true,
          file: {
            select: {
              fileId: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
              links: {
                select: {
                  fileLinkId: true,
                  relatedType: true,
                  relatedId: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'asc' as const },
              },
            },
          },
        },
        orderBy: { versionNumber: 'desc' as const },
      },
    },
  },
};

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
  ) {}

  async findAll() {
    return this.prisma.meeting.findMany({
      select: safeMeetingSelect,
      orderBy: { meetingDate: 'desc' },
    });
  }

  async findOne(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { meetingId },
      select: {
        ...safeMeetingSelect,
        minutes: {
          select: safeMeetingMinutesSelect,
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return this.serializeBigInt(meeting);
  }

  async create(dto: CreateMeetingDto) {
    return this.prisma.meeting.create({
      data: {
        meetingDate: new Date(dto.meetingDate),
        title: dto.title,
        notes: dto.notes,
      },
      select: safeMeetingSelect,
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
      select: safeMeetingSelect,
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

  async listMinutes(meetingId: string) {
    await this.ensureMeetingExists(meetingId);

    const minutes = await this.prisma.meetingMinutes.findMany({
      where: { meetingId },
      select: safeMeetingMinutesSelect,
      orderBy: { createdAt: 'desc' },
    });

    return this.serializeBigInt(minutes);
  }

  async uploadMinutes(
    meetingId: string,
    uploadedByUserId: string,
    file: UploadedPdfFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { meetingId },
      select: safeMeetingSelect,
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const document = await this.documentsService.createDocument({
      title: `${meeting.title} Minutes ${meeting.meetingDate.toISOString().slice(0, 10)}`,
      docType: DocumentType.MEETING_MINUTES,
      visibility: DocumentVisibility.OWNERS_ONLY,
      isMandatory: false,
      description: `Meeting minutes for ${meeting.title}`,
    });

    const version = await this.documentsService.createVersion(
      document.documentId,
      uploadedByUserId,
      file,
    );

    const meetingMinutes = await this.prisma.meetingMinutes.create({
      data: {
        meetingId,
        documentId: document.documentId,
      },
      select: {
        meetingMinutesId: true,
      },
    });

    await this.prisma.fileLink.createMany({
      data: [
        {
          fileId: version.file.fileId,
          relatedType: 'MEETING',
          relatedId: meetingId,
          linkedByUserId: uploadedByUserId,
        },
        {
          fileId: version.file.fileId,
          relatedType: 'MEETING_MINUTES',
          relatedId: meetingMinutes.meetingMinutesId,
          linkedByUserId: uploadedByUserId,
        },
      ],
    });

    return this.listMinutes(meetingId);
  }

  private async ensureMeetingExists(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { meetingId },
      select: { meetingId: true },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
  }

  private serializeBigInt<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, currentValue: unknown) =>
        typeof currentValue === 'bigint' ? Number(currentValue) : currentValue,
      ),
    ) as T;
  }
}
