import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity.js';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { OpenAiModelService } from '../models/openai-model.service.js';
import { OllamaModelService } from '../models/ollama-model.service.js';
import { LlmModelService, LlmProvider } from '../models/llm-model.service.js';

type ConversationDto = { userId: string; conversationId: string };

const SYSTEM_PROMPT = 'You are a helpful assistant. Keep answers short.';

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;

  private readonly llms: Record<LlmProvider, LlmModelService>;

  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    openai: OpenAiModelService,
    ollama: OllamaModelService,
  ) {
    this.llms = { openai, ollama };
  }

  getHistory({ userId, conversationId }: ConversationDto): Promise<Message[]> {
    return this.messages.find({
      where: { userId, conversationId },
      order: { id: 'ASC' },
    });
  }

  async clearHistory({
    userId,
    conversationId,
  }: ConversationDto): Promise<void> {
    await this.messages.delete({ userId, conversationId });
  }

  async *streamReply(
    conversation: ConversationDto,
    content: string,
    provider: LlmProvider,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const history = await this.getHistory(conversation);

    const stream = this.llms[provider].streamChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(({ role, content }) => ({ role, content })),
        { role: 'user', content },
      ],
      signal,
    );

    let reply = '';
    try {
      for await (const delta of stream) {
        reply += delta;
        yield delta;
      }
    } catch {
      // Aborted or failed midway: keep whatever has arrived.
    } finally {
      await this.saveExchange(conversation, content, reply);
    }
  }

  private async saveExchange(
    { userId, conversationId }: ConversationDto,
    content: string,
    reply: string,
  ): Promise<void> {
    if (!reply) return;
    await this.messages.insert([
      { userId, conversationId, role: 'user', content },
      { userId, conversationId, role: 'assistant', content: reply },
    ]);
  }
}
