import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const corsOrigins = parseCorsOrigins(
      configService.get<string>('CORS_ORIGINS', 'http://localhost:5173'),
    );

    app.enableCors({
      allowedHeaders: ['Accept', 'Authorization', 'Content-Type'],
      credentials: false,
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'OPTIONS'],
      origin: corsOrigins,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`Unable to start the application: ${message}`);
    process.exitCode = 1;
  }
}

void bootstrap();
