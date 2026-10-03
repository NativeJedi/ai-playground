import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './message.entity.js';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';

type ConversationDto = { userId: string; conversationId: string };

const MODEL = 'gpt-4.1-mini';
const SYSTEM_PROMPT = 'You are a helpful assistant. Keep answers short.';

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;

  constructor(
    config: ConfigService,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {
    this.openai = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
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
    { userId, conversationId }: ConversationDto,
    content: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const history = await this.getHistory({ userId, conversationId });

    const stream = await this.openai.chat.completions.create(
      {
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map(({ role, content }) => ({ role, content })),
          { role: 'user', content },
        ],
      },
      { signal },
    );

    let reply = '';

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (!delta) continue;
        reply += delta;
        yield delta;
      }
    } catch {
      // Aborted or failed midway: keep whatever has arrived.
    } finally {
      await this.saveExchange({ userId, conversationId }, content, reply);
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
