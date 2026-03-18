import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  async findAll(
    @Query('status') status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    @Query('activeOnly') activeOnly?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const parsedSkip = skip ? Number(skip) : undefined;
    const parsedTake = take ? Number(take) : undefined;

    return this.announcementsService.findAll(
      status,
      activeOnly === 'true',
      parsedSkip,
      parsedTake,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(req.user.userId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
