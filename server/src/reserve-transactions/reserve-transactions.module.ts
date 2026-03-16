import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReserveTransactionsController } from './reserve-transactions.controller';
import { ReserveTransactionsService } from './reserve-transactions.service';

@Module({
  controllers: [ReserveTransactionsController],
  providers: [ReserveTransactionsService, PrismaService, RolesGuard],
})
export class ReserveTransactionsModule {}
