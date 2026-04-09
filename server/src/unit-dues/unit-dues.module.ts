import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailModule } from '../email/email.module';
import { UnitDuesController } from './unit-dues.controller';
import { UnitDuesService } from './unit-dues.service';

@Module({
  imports: [EmailModule],
  controllers: [UnitDuesController],
  providers: [UnitDuesService, PrismaService, RolesGuard],
})
export class UnitDuesModule {}
