import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        title: dto.title,
        docType: dto.docType,
        visibility: dto.visibility,
        isMandatory: dto.isMandatory ?? false,
        description: dto.description,
      },
    });
  }

  async update(documentId: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findUnique({
      where: { documentId },
    });

    if (!existing) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.update({
      where: { documentId },
      data: {
        title: dto.title,
        docType: dto.docType,
        visibility: dto.visibility,
        isMandatory: dto.isMandatory,
        description: dto.description,
      },
    });
  }

  async remove(documentId: string) {
    const existing = await this.prisma.document.findUnique({
      where: { documentId },
    });

    if (!existing) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.document.delete({
      where: { documentId },
    });

    return { deleted: true };
  }
}