import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  LLM_PROVIDERS,
  type LlmProvider,
} from '../models/llm-model.service.js';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsIn(LLM_PROVIDERS)
  provider: LlmProvider;
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
