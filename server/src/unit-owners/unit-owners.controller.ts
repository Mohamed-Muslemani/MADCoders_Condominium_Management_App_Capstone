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
import { CreateUnitOwnerDto } from './dto/create-unit-owner.dto';
import { UpdateUnitOwnerDto } from './dto/update-unit-owner.dto';
import { UnitOwnersService } from './unit-owners.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('unit-owners')
export class UnitOwnersController {
  constructor(private unitOwnersService: UnitOwnersService) {}

  @Get()
  async findAll() {
    return this.unitOwnersService.findAll();
  }

  @Get('unit/:unitId')
  async findByUnit(@Param('unitId') unitId: string) {
    return this.unitOwnersService.findByUnit(unitId);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.unitOwnersService.findByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.unitOwnersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUnitOwnerDto) {
    return this.unitOwnersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUnitOwnerDto) {
    return this.unitOwnersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.unitOwnersService.remove(id);
  }
}
