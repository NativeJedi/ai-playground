import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto } from './chat.dto.js';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  chat(@Body() { messages }: ChatRequestDto): ChatResponseDto {
    return { message: this.chatService.reply(messages) };
  }
}
