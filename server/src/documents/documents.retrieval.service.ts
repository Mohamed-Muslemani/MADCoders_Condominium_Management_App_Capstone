import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_SEARCH_LIMIT = 5;

type SearchRow = {
  chunkId: string;
  chunkText: string;
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  versionId: string;
  versionNumber: number;
  documentId: string;
  documentTitle: string;
  similarityScore: number;
};

@Injectable()
export class DocumentsRetrievalService {
  private readonly openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async search(query: string, limit = DEFAULT_SEARCH_LIMIT) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const embedding = await this.generateQueryEmbedding(query);
    const vectorLiteral = this.toVectorLiteral(embedding);

    const rows = await this.prisma.$queryRaw<SearchRow[]>(
      Prisma.sql`
        SELECT
          dc."chunk_id" AS "chunkId",
          dc."text" AS "chunkText",
          dc."chunk_index" AS "chunkIndex",
          dc."page_start" AS "pageStart",
          dc."page_end" AS "pageEnd",
          dv."version_id" AS "versionId",
          dv."version_number" AS "versionNumber",
          d."document_id" AS "documentId",
          d."title" AS "documentTitle",
          1 - (de."embedding" <=> ${vectorLiteral}::vector) AS "similarityScore"
        FROM "DOCUMENT_EMBEDDINGS" de
        INNER JOIN "DOCUMENT_CHUNKS" dc
          ON dc."chunk_id" = de."chunk_id"
        INNER JOIN "DOCUMENT_VERSIONS" dv
          ON dv."version_id" = dc."document_version_id"
        INNER JOIN "DOCUMENTS" d
          ON d."document_id" = dv."document_id"
        WHERE dv."index_status" = 'INDEXED'
        ORDER BY de."embedding" <=> ${vectorLiteral}::vector ASC
        LIMIT ${limit}
      `,
    );

    return rows.map((row) => ({
      chunkId: row.chunkId,
      chunkIndex: row.chunkIndex,
      text: row.chunkText,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      versionId: row.versionId,
      versionNumber: row.versionNumber,
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      similarityScore: Number(row.similarityScore),
    }));
  }

  private async generateQueryEmbedding(query: string) {
    try {
      const response = await this.openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new InternalServerErrorException(
          'Unexpected embedding dimension returned by OpenAI',
        );
      }

      return embedding;
    } catch (error) {
      console.error('DOCUMENT RETRIEVAL ERROR:', error);

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to generate query embedding');
    }
  }

  private toVectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }
}
