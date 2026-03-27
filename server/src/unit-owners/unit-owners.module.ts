import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnitOwnersController } from './unit-owners.controller';
import { UnitOwnersService } from './unit-owners.service';

@Module({
  controllers: [UnitOwnersController],
  providers: [UnitOwnersService, PrismaService, RolesGuard],
})
export class UnitOwnersModule {}
