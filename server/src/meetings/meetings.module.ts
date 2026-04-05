import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [DocumentsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, PrismaService, RolesGuard],
})
export class MeetingsModule {}
