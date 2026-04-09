import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';

@Module({
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService, PrismaService, RolesGuard],
})
export class ExpenseCategoriesModule {}
