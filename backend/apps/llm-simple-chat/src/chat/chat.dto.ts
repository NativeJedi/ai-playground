import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export class ChatMessageDto {
  @IsIn(CHAT_ROLES)
  role: ChatRole;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}

export class ChatResponseDto {
  message: ChatMessageDto;
}
