import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DuesImportsController } from './dues-imports.controller';
import { DuesImportsService } from './dues-imports.service';

@Module({
  controllers: [DuesImportsController],
  providers: [DuesImportsService, PrismaService, RolesGuard],
})
export class DuesImportsModule {}
