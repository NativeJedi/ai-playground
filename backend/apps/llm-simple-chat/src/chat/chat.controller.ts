import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  RequestMethod,
  Sse,
  SseSignal,
  MessageEvent,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';
import {
  ChatMessageDto,
  ConversationParamsDto,
  SendMessageDto,
} from './chat.dto.js';
import { endWith, from, map, Observable } from 'rxjs';
import { UserId } from './user-id.decorator.js';

@Controller('conversations/:conversationId/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async history(
    @UserId() userId: string,
    @Param() { conversationId }: ConversationParamsDto,
  ): Promise<ChatMessageDto[]> {
    const messages = await this.chatService.getHistory({
      userId,
      conversationId,
    });
    return messages.map(({ role, content }) => ({ role, content }));
  }

  @Sse('', { method: RequestMethod.POST })
  @HttpCode(200)
  send(
    @UserId() userId: string,
    @Param() { conversationId }: ConversationParamsDto,
    @Body() { content }: SendMessageDto,
    // Aborted by Nest when the client disconnects.
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    return from(
      this.chatService.streamReply({ userId, conversationId }, content, signal),
    ).pipe(
      map((delta) => ({ data: { delta } })),
      endWith({ type: 'done', data: {} }),
    );
  }

  @Delete()
  @HttpCode(204)
  async clear(
    @UserId() userId: string,
    @Param() { conversationId }: ConversationParamsDto,
  ): Promise<void> {
    await this.chatService.clearHistory({ userId, conversationId });
  }
}
