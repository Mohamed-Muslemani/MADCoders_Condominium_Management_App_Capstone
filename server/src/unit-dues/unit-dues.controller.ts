import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUnitDueDto } from './dto/create-unit-due.dto';
import { UpdateUnitDueDto } from './dto/update-unit-due.dto';
import { UnitDuesService } from './unit-dues.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('unit-dues')
export class UnitDuesController {
  constructor(private unitDuesService: UnitDuesService) {}

  @Get()
  async findAll() {
    return this.unitDuesService.findAll();
  }

  @Get('unit/:unitId')
  async findByUnit(@Param('unitId') unitId: string) {
    return this.unitDuesService.findByUnit(unitId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.unitDuesService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateUnitDueDto) {
    return this.unitDuesService.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUnitDueDto) {
    return this.unitDuesService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.unitDuesService.remove(id);
  }
}
