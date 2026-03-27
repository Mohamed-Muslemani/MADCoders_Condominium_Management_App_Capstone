import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaintenanceRequestsController } from './maintenance-requests.controller';
import { MaintenanceRequestsService } from './maintenance-requests.service';

@Module({
  controllers: [MaintenanceRequestsController],
  providers: [MaintenanceRequestsService, PrismaService, RolesGuard],
})
export class MaintenanceRequestsModule {}
