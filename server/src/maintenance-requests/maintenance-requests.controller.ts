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
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { QueryMaintenanceRequestDto } from './dto/query-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { MaintenanceRequestsService } from './maintenance-requests.service';

const MAX_MAINTENANCE_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const maintenanceAttachmentTypePattern = /(pdf|png|jpe?g|webp)$/i;

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(private maintenanceRequestsService: MaintenanceRequestsService) {}

  @Get()
  async findAll(@Req() req: any, @Query() query: QueryMaintenanceRequestDto) {
    return this.maintenanceRequestsService.findAll(req.user, query);
  }

  @Get('my')
  async findMy(@Req() req: any, @Query() query: QueryMaintenanceRequestDto) {
    return this.maintenanceRequestsService.findMy(req.user, query);
  }

  @Get('unit/:unitId')
  async findByUnit(@Req() req: any, @Param('unitId') unitId: string) {
    return this.maintenanceRequestsService.findByUnit(req.user, unitId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.maintenanceRequestsService.findOne(req.user, id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateMaintenanceRequestDto) {
    return this.maintenanceRequestsService.create(req.user, dto);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_MAINTENANCE_ATTACHMENT_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        const isAllowedMime =
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/webp';
        const isAllowedName = maintenanceAttachmentTypePattern.test(
          file.originalname.toLowerCase(),
        );

        callback(null, isAllowedMime || isAllowedName);
      },
    }),
  )
  async uploadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: maintenanceAttachmentTypePattern,
        })
        .addMaxSizeValidator({
          maxSize: MAX_MAINTENANCE_ATTACHMENT_SIZE_BYTES,
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
    return this.maintenanceRequestsService.uploadAttachment(req.user, id, file);
  }

  @Get('attachments/:fileId/download')
  async downloadAttachment(
    @Req() req: any,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.maintenanceRequestsService.getAttachmentDownload(
      req.user,
      fileId,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.originalName)}"`,
    );
    res.setHeader('Content-Length', String(result.sizeBytes));

    return new StreamableFile(result.stream);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceRequestDto,
  ) {
    return this.maintenanceRequestsService.update(req.user, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.maintenanceRequestsService.remove(req.user, id);
  }
}
