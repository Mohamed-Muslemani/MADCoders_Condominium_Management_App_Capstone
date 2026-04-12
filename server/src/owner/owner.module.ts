import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentsModule } from '../documents/documents.module';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';

@Module({
  imports: [DocumentsModule],
  controllers: [OwnerController],
  providers: [OwnerService, PrismaService, RolesGuard],
})
export class OwnerModule {}
