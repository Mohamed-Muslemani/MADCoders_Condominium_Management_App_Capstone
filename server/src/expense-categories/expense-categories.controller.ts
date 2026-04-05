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
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoriesService } from './expense-categories.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get()
  async findAll() {
    return this.expenseCategoriesService.findAll();
  }

  @Get(':categoryId')
  async findOne(@Param('categoryId') categoryId: string) {
    return this.expenseCategoriesService.findOne(categoryId);
  }

  @Post()
  async create(@Body() dto: CreateExpenseCategoryDto) {
    return this.expenseCategoriesService.create(dto);
  }

  @Patch(':categoryId')
  async update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expenseCategoriesService.update(categoryId, dto);
  }

  @Delete(':categoryId')
  async remove(@Param('categoryId') categoryId: string) {
    return this.expenseCategoriesService.remove(categoryId);
  }
}
