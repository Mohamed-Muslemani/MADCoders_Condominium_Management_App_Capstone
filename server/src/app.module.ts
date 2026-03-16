import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ReserveTransactionsModule } from './reserve-transactions/reserve-transactions.module';
import { UnitOwnersModule } from './unit-owners/unit-owners.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    UnitsModule,
    UnitOwnersModule,
    ReserveTransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
