import { Module } from '@nestjs/common';
import { RootEnvModule } from '@app/config';
import { ChatController } from './chat/chat.controller.js';
import { ChatService } from './chat/chat.service.js';

@Module({
  imports: [RootEnvModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class LlmSimpleChatModule {}
