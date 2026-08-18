import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Product Checkout API')
      .setDescription(
        'API for products, customers, bills, deliveries and transactions.',
      )
      .setVersion('1.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs-json',
    });

    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`Unable to start the application: ${message}`);
    process.exitCode = 1;
  }
}

void bootstrap();
