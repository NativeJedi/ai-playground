import { Injectable } from '@nestjs/common';
import { ChatMessageDto } from './chat.dto.js';

@Injectable()
export class ChatService {
  // Stub: replace with a real LLM call.
  reply(messages: ChatMessageDto[]): ChatMessageDto {
    const lastMessage = messages[messages.length - 1];
    return { role: 'assistant', content: `You said: ${lastMessage.content}` };
  }
}
