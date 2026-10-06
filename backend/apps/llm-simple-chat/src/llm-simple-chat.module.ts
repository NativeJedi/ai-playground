import { Module } from '@nestjs/common';
import { RootEnvModule } from '@app/config';
import { DatabaseModule } from '@app/database';
import { ChatController } from './chat/chat.controller.js';
import { ChatService } from './chat/chat.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './chat/entities/message.entity.js';

@Module({
  imports: [RootEnvModule, DatabaseModule, TypeOrmModule.forFeature([Message])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class LlmSimpleChatModule {}
