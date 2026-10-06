import type { Repository } from 'typeorm';
import { ChatService } from './chat.service.js';
import type { Message } from './entities/message.entity.js';
import type { OpenAiModelService } from '../models/openai-model.service.js';
import type { OllamaModelService } from '../models/ollama-model.service.js';

const conversation = { userId: 'user-1', conversationId: 'conversation-1' };

async function* streamOf(deltas: string[], failAfterDeltas = false) {
  for (const delta of deltas) yield delta;
  if (failAfterDeltas) throw new Error('stream failed');
}

async function collect(stream: AsyncGenerator<string>): Promise<string[]> {
  const deltas: string[] = [];
  for await (const delta of stream) deltas.push(delta);
  return deltas;
}

describe('ChatService', () => {
  const messages = {
    find: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  };
  const openai = { streamChat: vi.fn() };
  const ollama = { streamChat: vi.fn() };
  let service: ChatService;

  beforeEach(() => {
    vi.resetAllMocks();
    messages.find.mockResolvedValue([]);
    service = new ChatService(
      messages as unknown as Repository<Message>,
      openai as unknown as OpenAiModelService,
      ollama as unknown as OllamaModelService,
    );
  });

  describe('getHistory', () => {
    it('returns the conversation messages oldest first', async () => {
      const stored = [{ role: 'user', content: 'hi' }];
      messages.find.mockResolvedValue(stored);

      const history = await service.getHistory(conversation);

      expect(history).toBe(stored);
      expect(messages.find).toHaveBeenCalledWith({
        where: conversation,
        order: { id: 'ASC' },
      });
    });
  });

  describe('clearHistory', () => {
    it('deletes only the messages of the conversation', async () => {
      await service.clearHistory(conversation);

      expect(messages.delete).toHaveBeenCalledWith(conversation);
    });
  });

  describe('streamReply', () => {
    it('yields every delta of the model', async () => {
      openai.streamChat.mockReturnValue(streamOf(['Hel', 'lo']));

      const deltas = await collect(
        service.streamReply(conversation, 'hi', 'openai'),
      );

      expect(deltas).toEqual(['Hel', 'lo']);
    });

    it.each([
      { provider: 'openai', used: openai, unused: ollama },
      { provider: 'ollama', used: ollama, unused: openai },
    ] as const)(
      'uses only the $provider model for that provider',
      async ({ provider, used, unused }) => {
        used.streamChat.mockReturnValue(streamOf(['ok']));

        await collect(service.streamReply(conversation, 'hi', provider));

        expect(used.streamChat).toHaveBeenCalledOnce();
        expect(unused.streamChat).not.toHaveBeenCalled();
      },
    );

    it('saves the user message and the full reply once the stream completes', async () => {
      openai.streamChat.mockReturnValue(streamOf(['Hel', 'lo']));

      await collect(service.streamReply(conversation, 'hi', 'openai'));

      expect(messages.insert).toHaveBeenCalledWith([
        { ...conversation, role: 'user', content: 'hi' },
        { ...conversation, role: 'assistant', content: 'Hello' },
      ]);
    });

    it('sends the system prompt, the stored history and the new message', async () => {
      messages.find.mockResolvedValue([
        { id: 1, ...conversation, role: 'user', content: 'first' },
        { id: 2, ...conversation, role: 'assistant', content: 'answer' },
      ]);
      ollama.streamChat.mockReturnValue(streamOf(['ok']));
      const signal = new AbortController().signal;

      await collect(
        service.streamReply(conversation, 'second', 'ollama', signal),
      );

      expect(ollama.streamChat).toHaveBeenCalledWith(
        [
          { role: 'system', content: expect.any(String) },
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'answer' },
          { role: 'user', content: 'second' },
        ],
        signal,
      );
    });

    it('still saves the partial reply when the stream fails midway', async () => {
      openai.streamChat.mockReturnValue(streamOf(['Par', 'tial'], true));

      const deltas = await collect(
        service.streamReply(conversation, 'hi', 'openai'),
      );

      expect(deltas).toEqual(['Par', 'tial']);
      expect(messages.insert).toHaveBeenCalledWith([
        { ...conversation, role: 'user', content: 'hi' },
        { ...conversation, role: 'assistant', content: 'Partial' },
      ]);
    });

    it('saves the partial reply when the consumer stops reading early', async () => {
      openai.streamChat.mockReturnValue(streamOf(['Par', 'tial']));

      const stream = service.streamReply(conversation, 'hi', 'openai');
      await stream.next();
      await stream.return(undefined);

      expect(messages.insert).toHaveBeenCalledWith([
        { ...conversation, role: 'user', content: 'hi' },
        { ...conversation, role: 'assistant', content: 'Par' },
      ]);
    });

    it('saves nothing when no reply was received', async () => {
      openai.streamChat.mockReturnValue(streamOf([]));

      await collect(service.streamReply(conversation, 'hi', 'openai'));

      expect(messages.insert).not.toHaveBeenCalled();
    });
  });
});
