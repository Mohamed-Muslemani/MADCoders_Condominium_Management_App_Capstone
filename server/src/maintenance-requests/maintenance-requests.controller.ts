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
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { QueryMaintenanceRequestDto } from './dto/query-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { MaintenanceRequestsService } from './maintenance-requests.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(
    private maintenanceRequestsService: MaintenanceRequestsService,
  ) {}

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
