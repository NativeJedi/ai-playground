import { Module } from '@nestjs/common';
import { RootEnvModule } from '@app/config';
import { DatabaseModule } from '@app/database';
import { ChatController } from './chat/chat.controller.js';
import { ChatService } from './chat/chat.service.js';

@Module({
  imports: [RootEnvModule, DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class LlmSimpleChatModule {}
