import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IndexStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_BATCH_SIZE = 100;

type ChunkRecord = {
  chunkId: string;
  chunkIndex: number;
  text: string;
};

@Injectable()
export class DocumentEmbeddingsService {
  private readonly openai: OpenAI;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateForVersion(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { versionId },
      select: { versionId: true },
    });

    if (!version) {
      throw new NotFoundException('Document version not found');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const message = 'OPENAI_API_KEY is not configured';
      await this.markFailed(versionId, message);
      throw new InternalServerErrorException(message);
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentVersionId: versionId },
      select: {
        chunkId: true,
        chunkIndex: true,
        text: true,
      },
      orderBy: { chunkIndex: 'asc' },
    });

    if (chunks.length === 0) {
      const message = 'No chunks found for this document version';
      await this.markFailed(versionId, message);
      throw new BadRequestException(message);
    }

    await this.prisma.documentVersion.update({
      where: { versionId },
      data: {
        indexStatus: IndexStatus.PENDING,
        indexError: null,
      },
    });

    try {
      const embeddings = await this.generateEmbeddings(chunks);

      await this.prisma.$transaction(async (tx) => {
        await tx.documentEmbedding.deleteMany({
          where: {
            chunkId: {
              in: chunks.map((chunk) => chunk.chunkId),
            },
          },
        });

        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index];
          const embedding = embeddings[index];

          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO "DOCUMENT_EMBEDDINGS"
                ("embedding_id", "chunk_id", "model_name", "embedding", "created_at")
              VALUES
                (${randomUUID()}, ${chunk.chunkId}, ${EMBEDDING_MODEL}, ${this.toVectorLiteral(embedding)}::vector, NOW())
            `,
          );
        }

        await tx.documentVersion.update({
          where: { versionId },
          data: {
            indexStatus: IndexStatus.INDEXED,
            indexedAt: new Date(),
            indexError: null,
          },
        });
      });
    } catch (error) {
      console.error('EMBEDDING ERROR:', error);

      const message =
        error instanceof BadRequestException ||
        error instanceof NotFoundException
          ? error.message
          : this.extractErrorMessage(error);

      await this.markFailed(versionId, message);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(message);
    }
  }

  private async generateEmbeddings(chunks: ChunkRecord[]) {
    const vectors: number[][] = [];

    for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE);

      const response = await this.openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map((chunk) => chunk.text),
      });

      for (const item of response.data) {
        if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new InternalServerErrorException(
            'Unexpected embedding dimension returned by OpenAI',
          );
        }

        vectors.push(item.embedding);
      }
    }

    if (vectors.length !== chunks.length) {
      throw new InternalServerErrorException(
        'Embedding count mismatch for processed chunks',
      );
    }

    return vectors;
  }

  private toVectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }

  private extractErrorMessage(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.trim()
    ) {
      return error.message;
    }

    return 'Embedding generation failed';
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
