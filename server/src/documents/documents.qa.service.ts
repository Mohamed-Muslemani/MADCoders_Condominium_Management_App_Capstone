import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { DocumentsRetrievalService } from './documents.retrieval.service';

const QA_MODEL = 'gpt-5.4-nano';
const MIN_SIMILARITY_SCORE = 0.2;
const MAX_CONTEXT_RESULTS = 5;

type RetrievalResult = {
  chunkId: string;
  chunkIndex: number;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  versionId: string;
  versionNumber: number;
  documentId: string;
  documentTitle: string;
  similarityScore: number;
};

type QaModelResponse = {
  answer: string;
  citations: number[];
};

@Injectable()
export class DocumentsQaService {
  private readonly openai: OpenAI;

  constructor(private retrievalService: DocumentsRetrievalService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async ask(query: string) {
    if (!query.trim()) {
      throw new BadRequestException('query must not be empty');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const retrievalResults = await this.retrievalService.search(
      query.trim(),
      MAX_CONTEXT_RESULTS,
    );

    const relevantChunks = retrievalResults.filter(
      (result) => result.similarityScore >= MIN_SIMILARITY_SCORE,
    );

    if (relevantChunks.length === 0) {
      return {
        answer: 'No relevant information found in documents',
        citations: [],
      };
    }

    const modelResponse = await this.generateGroundedAnswer(
      query.trim(),
      relevantChunks,
    );

    const citations = this.mapCitations(
      modelResponse.citations,
      relevantChunks,
    );

    return {
      answer:
        modelResponse.answer.trim() ||
        'No relevant information found in documents',
      citations,
    };
  }

  private async generateGroundedAnswer(
    query: string,
    chunks: RetrievalResult[],
  ): Promise<QaModelResponse> {
    const prompt = this.buildUserPrompt(query, chunks);

    try {
      const response = await this.openai.responses.create({
        model: QA_MODEL,
        instructions: this.buildSystemPrompt(),
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'document_answer',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                answer: {
                  type: 'string',
                },
                citations: {
                  type: 'array',
                  items: {
                    type: 'integer',
                  },
                },
              },
              required: ['answer', 'citations'],
            },
          },
        },
      });

      return JSON.parse(response.output_text) as QaModelResponse;
    } catch (error) {
      console.error('DOCUMENT QA ERROR:', error);
      throw new InternalServerErrorException(
        'Failed to generate document answer',
      );
    }
  }

  private buildSystemPrompt() {
    return [
      'You are a document question answering assistant for CondoManager.',
      'Answer ONLY using the provided context chunks.',
      'Do not use outside knowledge.',
      'If the context does not contain enough information, answer exactly: "No relevant information found in documents".',
      'Keep the answer concise and factual.',
      'Return JSON with:',
      '- answer: string',
      '- citations: array of integer context IDs you actually used',
    ].join('\n');
  }

  private buildUserPrompt(query: string, chunks: RetrievalResult[]) {
    const context = chunks
      .map((chunk, index) => {
        const contextId = index + 1;
        const pageLabel =
          chunk.pageStart && chunk.pageEnd
            ? chunk.pageStart === chunk.pageEnd
              ? `page ${chunk.pageStart}`
              : `pages ${chunk.pageStart}-${chunk.pageEnd}`
            : 'page unknown';

        return [
          `Context ${contextId}`,
          `Document: ${chunk.documentTitle}`,
          `Version: ${chunk.versionNumber}`,
          `Location: ${pageLabel}`,
          `Similarity: ${chunk.similarityScore.toFixed(4)}`,
          `Text: ${chunk.text}`,
        ].join('\n');
      })
      .join('\n\n---\n\n');

    return [
      `Question: ${query}`,
      '',
      'Use only the context below.',
      '',
      context,
    ].join('\n');
  }

  private mapCitations(citationIndexes: number[], chunks: RetrievalResult[]) {
    const seen = new Set<string>();

    return citationIndexes
      .map((citationIndex) => chunks[citationIndex - 1])
      .filter((chunk): chunk is RetrievalResult => Boolean(chunk))
      .map((chunk) => ({
        documentTitle: chunk.documentTitle,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
      }))
      .filter((citation) => {
        const key = `${citation.documentTitle}:${citation.pageStart ?? 'null'}:${citation.pageEnd ?? 'null'}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }
}
