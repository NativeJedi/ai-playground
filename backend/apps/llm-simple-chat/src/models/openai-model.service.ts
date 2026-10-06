import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { LlmModelService, type LlmMessage } from './llm-model.service.js';

@Injectable()
export class OpenAiModelService extends LlmModelService {
  private readonly client: OpenAI;

  constructor(config: ConfigService) {
    super();
    this.client = new OpenAI({ apiKey: config.getOrThrow('OPENAI_API_KEY') });
  }

  async *streamChat(messages: LlmMessage[], signal?: AbortSignal) {
    const stream = await this.client.chat.completions.create(
      { model: 'gpt-4.1-mini', stream: true, messages },
      { signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
