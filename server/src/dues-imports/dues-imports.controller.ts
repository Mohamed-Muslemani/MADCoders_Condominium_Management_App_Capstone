import {
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
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
import { DuesImportsService } from './dues-imports.service';

const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('dues-imports')
export class DuesImportsController {
  constructor(private readonly duesImportsService: DuesImportsService) {}

  @Get()
  async findAll() {
    return this.duesImportsService.findAll();
  }

  @Get(':batchId')
  async findOne(@Param('batchId') batchId: string) {
    return this.duesImportsService.findOne(batchId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_CSV_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        const isCsv =
          ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(
            file.mimetype,
          ) || file.originalname.toLowerCase().endsWith('.csv');

        callback(null, isCsv);
      },
    }),
  )
  async importCsv(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: MAX_CSV_FILE_SIZE_BYTES,
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
    return this.duesImportsService.importCsv(req.user.userId, file);
  }
}
