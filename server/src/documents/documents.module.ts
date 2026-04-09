import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsController } from './documents.controller';
import { DocumentEmbeddingsService } from './documents.embeddings.service';
import { DocumentIngestionService } from './documents.ingestion.service';
import { DocumentsQaService } from './documents.qa.service';
import { DocumentsRetrievalService } from './documents.retrieval.service';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentIngestionService,
    DocumentEmbeddingsService,
    DocumentsRetrievalService,
    DocumentsQaService,
    PrismaService,
  ],
  exports: [
    DocumentsService,
    DocumentIngestionService,
    DocumentEmbeddingsService,
    DocumentsRetrievalService,
    DocumentsQaService,
  ],
})
export class DocumentsModule {}
