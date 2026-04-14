import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentEmbeddingsService } from './documents.embeddings.service';
import { DocumentIngestionService } from './documents.ingestion.service';
import { DocumentsQaService } from './documents.qa.service';
import { DocumentsRetrievalService } from './documents.retrieval.service';
import { UpdateDocumentDto } from './dto/update-document.dto';

type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue: unknown) =>
      typeof currentValue === 'bigint' ? Number(currentValue) : currentValue,
    ),
  ) as T;
}

const documentSelect = {
  documentId: true,
  title: true,
  docType: true,
  visibility: true,
  isMandatory: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  versions: {
    select: {
      versionId: true,
      versionNumber: true,
      isCurrent: true,
      indexStatus: true,
      indexedAt: true,
      indexError: true,
      uploadedAt: true,
      file: {
        select: {
          fileId: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
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
};

const versionSelect = {
  versionId: true,
  documentId: true,
  versionNumber: true,
  uploadedByUserId: true,
  isCurrent: true,
  indexStatus: true,
  indexedAt: true,
  indexError: true,
  uploadedAt: true,
  file: {
    select: {
      fileId: true,
      originalName: true,
      storagePath: true,
      mimeType: true,
      sizeBytes: true,
      sha256Hash: true,
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
  chunks: {
    select: {
      chunkId: true,
      chunkIndex: true,
      pageStart: true,
      pageEnd: true,
      text: true,
      createdAt: true,
      embedding: {
        select: {
          embeddingId: true,
          modelName: true,
          createdAt: true,
        },
      },
    },
    orderBy: { chunkIndex: 'asc' as const },
  },
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private ingestionService: DocumentIngestionService,
    private embeddingsService: DocumentEmbeddingsService,
    private retrievalService: DocumentsRetrievalService,
    private qaService: DocumentsQaService,
  ) {}

  async createDocument(dto: CreateDocumentDto) {
    const document = await this.prisma.document.create({
      data: {
        title: dto.title,
        docType: dto.docType,
        visibility: dto.visibility,
        isMandatory: dto.isMandatory ?? false,
        description: dto.description ?? null,
      },
      select: documentSelect,
    });

    return serializeBigInt(document);
  }

  async create(dto: CreateDocumentDto) {
    return this.createDocument(dto);
  }

  async findAll() {
    const documents = await this.prisma.document.findMany({
      select: documentSelect,
      orderBy: { createdAt: 'desc' },
    });

    return serializeBigInt(documents);
  }

  async findOne(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { documentId },
      select: documentSelect,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return serializeBigInt(document);
  }

  async update(documentId: string, dto: UpdateDocumentDto) {
    await this.ensureDocumentExists(documentId);

    const document = await this.prisma.document.update({
      where: { documentId },
      data: {
        title: dto.title,
        docType: dto.docType,
        visibility: dto.visibility,
        isMandatory: dto.isMandatory,
        description: dto.description,
      },
      select: documentSelect,
    });

    return serializeBigInt(document);
  }

  async remove(documentId: string) {
    await this.ensureDocumentExists(documentId);

    await this.prisma.document.delete({
      where: { documentId },
    });

    return { deleted: true };
  }

  async findVersion(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { versionId },
      select: versionSelect,
    });

    if (!version) {
      throw new NotFoundException('Document version not found');
    }

    return serializeBigInt(version);
  }

  async createVersion(
    documentId: string,
    uploadedByUserId: string,
    file: UploadedDocumentFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    await this.ensureDocumentExists(documentId);

    const storedFile = await this.persistFile(file);

    let version: { versionId: string };

    try {
      version = await this.prisma.$transaction(async (tx) => {
        const current = await tx.documentVersion.aggregate({
          where: { documentId },
          _max: { versionNumber: true },
        });

        const createdFile = await tx.file.create({
          data: {
            originalName: file.originalname,
            storagePath: storedFile.storagePath,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            sha256Hash: storedFile.sha256Hash,
            uploadedByUserId,
          },
          select: { fileId: true },
        });

        await tx.documentVersion.updateMany({
          where: { documentId, isCurrent: true },
          data: { isCurrent: false },
        });

        const createdVersion = await tx.documentVersion.create({
          data: {
            documentId,
            fileId: createdFile.fileId,
            versionNumber: (current._max.versionNumber ?? 0) + 1,
            uploadedByUserId,
            isCurrent: true,
          },
          select: { versionId: true },
        });

        await tx.fileLink.createMany({
          data: [
            {
              fileId: createdFile.fileId,
              relatedType: 'DOCUMENT',
              relatedId: documentId,
              linkedByUserId: uploadedByUserId,
            },
            {
              fileId: createdFile.fileId,
              relatedType: 'DOCUMENT_VERSION',
              relatedId: createdVersion.versionId,
              linkedByUserId: uploadedByUserId,
            },
          ],
        });

        return createdVersion;
      });
    } catch (error) {
      await this.deleteStoredFile(storedFile.storagePath);
      throw error;
    }

    return this.processVersionForAi(version.versionId);
  }

  async reprocessVersion(versionId: string) {
    await this.findVersion(versionId);
    return this.processVersionForAi(versionId);
  }

  async generateEmbeddings(versionId: string) {
    await this.findVersion(versionId);
    await this.embeddingsService.generateForVersion(versionId);
    return this.findVersion(versionId);
  }

  private async processVersionForAi(versionId: string) {
    try {
      await this.ingestionService.processDocumentVersion(versionId);
      await this.embeddingsService.generateForVersion(versionId);
    } catch {
      // Return the current version state so the UI can show a precise failure
      // message instead of treating the upload as missing entirely.
    }

    return this.findVersion(versionId);
  }

  async getVersionDownload(
    versionId: string,
    user: { userId: string; role: 'ADMIN' | 'OWNER' },
  ) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { versionId },
      select: {
        versionId: true,
        file: {
          select: {
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            storagePath: true,
          },
        },
        document: {
          select: {
            visibility: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Document version not found');
    }

    if (
      user.role === 'OWNER' &&
      version.document.visibility === 'BOARD_ONLY'
    ) {
      throw new ForbiddenException('Forbidden resource');
    }

    return {
      originalName: version.file.originalName,
      mimeType: version.file.mimeType,
      sizeBytes: Number(version.file.sizeBytes),
      stream: createReadStream(version.file.storagePath),
    };
  }

  async search(query: string) {
    if (!query.trim()) {
      throw new BadRequestException('query must not be empty');
    }

    return this.retrievalService.search(query.trim());
  }

  async ask(query: string) {
    if (!query.trim()) {
      throw new BadRequestException('query must not be empty');
    }

    return this.qaService.ask(query.trim());
  }

  private async ensureDocumentExists(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { documentId },
      select: { documentId: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }
  }

  private async persistFile(file: UploadedDocumentFile) {
    const uploadDir = join(process.cwd(), 'storage', 'documents');
    await fs.mkdir(uploadDir, { recursive: true });

    const extension = extname(file.originalname) || '.pdf';
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const storagePath = join(uploadDir, filename);
    const sha256Hash = createHash('sha256').update(file.buffer).digest('hex');

    await fs.writeFile(storagePath, file.buffer);

    return {
      storagePath,
      sha256Hash,
    };
  }

  private async deleteStoredFile(storagePath: string) {
    try {
      await fs.unlink(storagePath);
    } catch {
      // Ignore
    }
  }
}
