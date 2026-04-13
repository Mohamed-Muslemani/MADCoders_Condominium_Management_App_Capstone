import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReserveTransactionDto } from './dto/create-reserve-transaction.dto';
import { QueryReserveTransactionsDto } from './dto/query-reserve-transactions.dto';
import { UpdateReserveTransactionDto } from './dto/update-reserve-transaction.dto';
import { ReserveTransactionsService } from './reserve-transactions.service';

const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const receiptFileTypePattern = /(png|jpe?g)$/i;

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reserve-transactions')
export class ReserveTransactionsController {
  constructor(private reserveTransactionsService: ReserveTransactionsService) {}

  @Get()
  async findAll(@Query() query: QueryReserveTransactionsDto) {
    return this.reserveTransactionsService.findAll(query);
  }

  @Get('expenses')
  async findExpenses() {
    return this.reserveTransactionsService.findExpenses();
  }

  @Get('projections')
  async findProjections() {
    return this.reserveTransactionsService.findProjections();
  }

  @Get('category/:categoryId')
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.reserveTransactionsService.findByCategory(categoryId);
  }

  @Get('date-range')
  async findByDateRange(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.reserveTransactionsService.findByDateRange(dateFrom, dateTo);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reserveTransactionsService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateReserveTransactionDto) {
    return this.reserveTransactionsService.create(req.user.userId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReserveTransactionDto,
  ) {
    return this.reserveTransactionsService.update(id, dto);
  }

  @Roles('ADMIN')
  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_RECEIPT_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        const isAllowedMime =
          file.mimetype === 'image/png' || file.mimetype === 'image/jpeg';
        const isAllowedName = receiptFileTypePattern.test(
          file.originalname.toLowerCase(),
        );

        callback(null, isAllowedMime || isAllowedName);
      },
    }),
  )
  async uploadReceipt(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: receiptFileTypePattern,
        })
        .addMaxSizeValidator({
          maxSize: MAX_RECEIPT_FILE_SIZE_BYTES,
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
    return this.reserveTransactionsService.uploadReceipt(req.user, id, file);
  }

  @Roles('ADMIN')
  @Get(':id/receipt/download')
  async downloadReceipt(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reserveTransactionsService.getReceiptDownload(id);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.originalName)}"`,
    );
    res.setHeader('Content-Length', String(result.sizeBytes));

    return new StreamableFile(result.stream);
  }

  @Roles('ADMIN')
  @Delete(':id/receipt')
  async removeReceipt(@Param('id') id: string) {
    return this.reserveTransactionsService.removeReceipt(id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.reserveTransactionsService.remove(id);
  }
}
