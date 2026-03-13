import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, UnitsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
