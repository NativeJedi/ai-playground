import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { LlmMessage, LlmModelService } from './llm-model.service.js';

@Injectable()
export class OllamaModelService extends LlmModelService {
  private readonly client: Ollama;

  constructor(config: ConfigService) {
    super();
    this.client = new Ollama({
      host: config.get('OLLAMA_HOST', 'http://localhost:11434'),
    });
  }

  async *streamChat(messages: LlmMessage[], signal?: AbortSignal) {
    const stream = await this.client.chat({
      model: 'llama3.2',
      messages,
      stream: true,
    });

    // Ollama SDK has own abort() method
    const abort = () => stream.abort();
    signal?.addEventListener('abort', abort, { once: true });

    try {
      for await (const part of stream) {
        if (part.message.content) yield part.message.content;
      }
    } finally {
      signal?.removeEventListener('abort', abort);
      stream.abort(); // stop generation if consumer stops reading earlier
    }
  }
}
