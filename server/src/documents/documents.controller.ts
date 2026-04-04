import {
  Body,
  Controller,
  Get,
  ParseFilePipeBuilder,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AskDocumentsDto } from './dto/ask-documents.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import { DocumentsService } from './documents.service';

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  async createDocument(@Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(dto);
  }

  @Post('search')
  async search(@Body() dto: SearchDocumentsDto) {
    return this.documentsService.search(dto.query);
  }

  @Post('ask')
  async ask(@Body() dto: AskDocumentsDto) {
    return this.documentsService.ask(dto.query);
  }

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Get('versions/:versionId')
  async findVersion(@Param('versionId') versionId: string) {
    return this.documentsService.findVersion(versionId);
  }

  @Post('versions/:versionId/reprocess')
  async reprocessVersion(@Param('versionId') versionId: string) {
    return this.documentsService.reprocessVersion(versionId);
  }

  @Post('versions/:versionId/embeddings')
  async generateEmbeddings(@Param('versionId') versionId: string) {
    return this.documentsService.generateEmbeddings(versionId);
  }

  @Get(':documentId')
  async findOne(@Param('documentId') documentId: string) {
    return this.documentsService.findOne(documentId);
  }

  @Post(':documentId/versions')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_PDF_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        const isPdf =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');

        callback(null, isPdf);
      },
    }),
  )
  async createVersion(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'pdf',
        })
        .addMaxSizeValidator({
          maxSize: MAX_PDF_FILE_SIZE_BYTES,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: 400,
        }),
    )
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.documentsService.createVersion(
      documentId,
      req.user.userId,
      file,
    );
  }
}
