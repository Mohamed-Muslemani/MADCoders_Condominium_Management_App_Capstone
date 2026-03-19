import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { Request } from 'express';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // This is an owner method.
  @Get('me')
async getMe(
  @Req() req: Request & { user: { sub?: string; userId?: string } },
) {
  const userId = req.user?.sub || req.user?.userId;

  if (!userId) {
    throw new Error('User ID not found in token');
  }

  return this.usersService.findOne(userId);
}

// This is an owner method. 
  @Patch('me')
async updateMe(
  @Req() req: Request & { user: { sub?: string; userId?: string } },
  @Body() dto: UpdateUserDto,
) {
  const userId = req.user?.sub || req.user?.userId;

  if (!userId) {
    throw new Error('User ID not found in token');
  }

  return this.usersService.updateOwnProfile(userId, dto);
}

  @Roles('ADMIN')
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Roles('ADMIN')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}