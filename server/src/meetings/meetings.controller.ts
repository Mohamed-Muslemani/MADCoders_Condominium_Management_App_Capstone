import {
  Body,
  Controller,
  Delete,
  Get,
  ParseFilePipeBuilder,
  Param,
  Patch,
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
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

const MAX_MEETING_MINUTES_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll() {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get(':id/minutes')
  findMinutes(@Param('id') id: string) {
    return this.meetingsService.listMinutes(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateMeetingDto) {
    return this.meetingsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateMeetingDto) {
    return this.meetingsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.meetingsService.remove(id);
  }

  @Roles('ADMIN')
  @Post(':id/minutes')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_MEETING_MINUTES_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        const isPdf =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');

        callback(null, isPdf);
      },
    }),
  )
  uploadMinutes(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'pdf',
        })
        .addMaxSizeValidator({
          maxSize: MAX_MEETING_MINUTES_FILE_SIZE_BYTES,
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
    return this.meetingsService.uploadMinutes(id, req.user.userId, file);
  }
}
