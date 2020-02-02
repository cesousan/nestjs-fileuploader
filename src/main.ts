import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import corsOptions from './config/cors.config';

const PORT = process.env.SERVER_PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions);
  await app.listen(PORT);
}
bootstrap();
