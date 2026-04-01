import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields
      forbidNonWhitelisted: true, // errors if extra fields sent
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
