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
import { CreateReserveTransactionDto } from './dto/create-reserve-transaction.dto';
import { QueryReserveTransactionsDto } from './dto/query-reserve-transactions.dto';
import { UpdateReserveTransactionDto } from './dto/update-reserve-transaction.dto';
import { ReserveTransactionsService } from './reserve-transactions.service';

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
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.reserveTransactionsService.remove(id);
  }
}
