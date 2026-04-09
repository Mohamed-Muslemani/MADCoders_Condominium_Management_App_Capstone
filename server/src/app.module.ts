import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuthModule } from './auth/auth.module';
import { MaintenanceRequestsModule } from './maintenance-requests/maintenance-requests.module';
import { UnitDuesModule } from './unit-dues/unit-dues.module';
import { ReserveTransactionsModule } from './reserve-transactions/reserve-transactions.module';
import { UnitOwnersModule } from './unit-owners/unit-owners.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { MeetingsModule } from './meetings/meetings.module';
import { DocumentsModule } from './documents/documents.module';
import { DuesImportsModule } from './dues-imports/dues-imports.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { OwnerModule } from './owner/owner.module';


@Module({
  imports: [
    AnnouncementsModule,
    AuthModule,
    MaintenanceRequestsModule,
    UsersModule,
    UnitsModule,
    UnitOwnersModule,
    UnitDuesModule,
    ReserveTransactionsModule,
    ExpenseCategoriesModule,
    OwnerModule,
    DuesImportsModule,
    EmailModule,
    MeetingsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
