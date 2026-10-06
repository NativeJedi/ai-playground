import { Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';
import { LlmMessage, LlmModelService } from './llm-model.service.js';

// Name of the ollama service in docker-compose.yml.
const OLLAMA_HOST = 'http://ollama:11434';

@Injectable()
export class OllamaModelService extends LlmModelService {
  private readonly client = new Ollama({ host: OLLAMA_HOST });

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
