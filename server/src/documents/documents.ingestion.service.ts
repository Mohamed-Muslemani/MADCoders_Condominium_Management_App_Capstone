import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { IndexStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../../prisma/prisma.service';

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type ChunkPayload = {
  chunkIndex: number;
  pageStart?: number;
  pageEnd?: number;
  text: string;
};

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

@Injectable()
export class DocumentIngestionService {
  constructor(private prisma: PrismaService) {}

  async processDocumentVersion(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { versionId },
      include: { file: true },
    });

    if (!version) {
      throw new NotFoundException('Document version not found');
    }

    if (!this.isPdf(version.file.mimeType, version.file.originalName)) {
      const errorMessage =
        'Only PDF files are supported for document ingestion';
      await this.markFailed(versionId, errorMessage);
      throw new UnsupportedMediaTypeException(errorMessage);
    }

    let buffer: Buffer;

    try {
      buffer = await fs.readFile(version.file.storagePath);
    } catch {
      const errorMessage = 'Stored file could not be read for ingestion';
      await this.markFailed(versionId, errorMessage);
      throw new NotFoundException(errorMessage);
    }

    try {
      const pages = await this.extractPagesFromPdf(buffer);
      const chunks = this.chunkPages(pages);

      if (chunks.length === 0) {
        throw new BadRequestException(
          'No extractable text was found in the uploaded PDF',
        );
      }

      await this.prisma.$transaction([
        this.prisma.documentChunk.deleteMany({
          where: { documentVersionId: versionId },
        }),
        this.prisma.documentChunk.createMany({
          data: chunks.map((chunk) => ({
            documentVersionId: versionId,
            chunkIndex: chunk.chunkIndex,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            text: chunk.text,
          })),
        }),
        this.prisma.documentVersion.update({
          where: { versionId },
          data: {
            indexStatus: IndexStatus.INDEXED,
            indexedAt: new Date(),
            indexError: null,
          },
        }),
      ]);
    } catch (error) {
      console.error('DOCUMENT INGESTION ERROR:', error);

      const message =
        error instanceof BadRequestException ||
        error instanceof UnsupportedMediaTypeException
          ? error.message
          : 'Document ingestion failed';

      await this.markFailed(versionId, message);

      if (
        error instanceof BadRequestException ||
        error instanceof UnsupportedMediaTypeException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(message);
    }
  }

  private async extractPagesFromPdf(buffer: Buffer): Promise<ExtractedPage[]> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      return result.pages
        .map((page) => ({
          pageNumber: page.num,
          text: this.normalizePageText(page.text),
        }))
        .filter((page) => page.text.length > 0);
    } catch (error) {
      console.error('PDF PARSE ERROR:', error);
      throw new BadRequestException('Invalid or unreadable PDF file');
    } finally {
      await parser.destroy();
    }
  }

  private normalizePageText(text: string) {
    return text
      .replace(/ *\n */g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private chunkPages(pages: ExtractedPage[]): ChunkPayload[] {
    const chunks: ChunkPayload[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();

      if (!pageText) {
        continue;
      }

      let start = 0;

      while (start < pageText.length) {
        let end = Math.min(start + CHUNK_SIZE, pageText.length);

        if (end < pageText.length) {
          const lastSpace = pageText.lastIndexOf(' ', end);
          if (lastSpace > start + Math.floor(CHUNK_SIZE * 0.6)) {
            end = lastSpace;
          }
        }

        const text = pageText.slice(start, end).trim();

        if (text) {
          chunks.push({
            chunkIndex,
            pageStart: page.pageNumber,
            pageEnd: page.pageNumber,
            text,
          });
          chunkIndex += 1;
        }

        if (end >= pageText.length) {
          break;
        }

        start = Math.max(end - CHUNK_OVERLAP, start + 1);
      }
    }

    return chunks;
  }

  private isPdf(mimeType: string, originalName: string) {
    return (
      mimeType === 'application/pdf' ||
      originalName.toLowerCase().endsWith('.pdf')
    );
  }

  private async markFailed(versionId: string, message: string) {
    await this.prisma.documentVersion.update({
      where: { versionId },
      data: {
        indexStatus: IndexStatus.FAILED,
        indexedAt: null,
        indexError: message,
      },
    });
  }
}
