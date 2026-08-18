import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`Unable to start the application: ${message}`);
    process.exitCode = 1;
  }
}

void bootstrap();
