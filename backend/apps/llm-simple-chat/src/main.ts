import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LlmSimpleChatModule } from './llm-simple-chat.module.js';

const PORT = 3001;

async function bootstrap() {
  const app = await NestFactory.create(LlmSimpleChatModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(PORT);
}
await bootstrap();
