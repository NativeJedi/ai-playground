import { IsNotEmpty, IsString } from 'class-validator';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatMessageDto {
  role: ChatRole;
  content: string;
}

export class ConversationParamsDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
