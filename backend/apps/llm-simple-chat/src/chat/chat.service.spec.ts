import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { ChatService } from './chat.service.js';
import type { Message } from './message.entity.js';

const createCompletion = vi.fn();

vi.mock('openai', () => ({
  OpenAI: class {
    chat = { completions: { create: createCompletion } };
  },
}));

const conversation = { userId: 'user-1', conversationId: 'conversation-1' };

function chunk(delta?: string) {
  return { choices: [{ delta: { content: delta } }] };
}

async function* streamOf(deltas: string[], failAfterDeltas = false) {
  for (const delta of deltas) yield chunk(delta);
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
  let service: ChatService;

  beforeEach(() => {
    vi.resetAllMocks();
    messages.find.mockResolvedValue([]);
    const config = { getOrThrow: () => 'test-key' } as unknown as ConfigService;
    service = new ChatService(
      config,
      messages as unknown as Repository<Message>,
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
    it('yields every delta and skips empty chunks', async () => {
      createCompletion.mockResolvedValue(
        (async function* () {
          yield chunk('Hel');
          yield chunk(undefined);
          yield chunk('');
          yield { choices: [] };
          yield chunk('lo');
        })(),
      );

      const deltas = await collect(service.streamReply(conversation, 'hi'));

      expect(deltas).toEqual(['Hel', 'lo']);
    });

    it('saves the user message and the full reply once the stream completes', async () => {
      createCompletion.mockResolvedValue(streamOf(['Hel', 'lo']));

      await collect(service.streamReply(conversation, 'hi'));

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
      createCompletion.mockResolvedValue(streamOf(['ok']));
      const signal = new AbortController().signal;

      await collect(service.streamReply(conversation, 'second', signal));

      const [body, options] = createCompletion.mock.calls[0];
      expect(body.stream).toBe(true);
      expect(body.messages).toEqual([
        { role: 'system', content: expect.any(String) },
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'answer' },
        { role: 'user', content: 'second' },
      ]);
      expect(options).toEqual({ signal });
    });

    it('still saves the partial reply when the stream fails midway', async () => {
      createCompletion.mockResolvedValue(streamOf(['Par', 'tial'], true));

      const deltas = await collect(service.streamReply(conversation, 'hi'));

      expect(deltas).toEqual(['Par', 'tial']);
      expect(messages.insert).toHaveBeenCalledWith([
        { ...conversation, role: 'user', content: 'hi' },
        { ...conversation, role: 'assistant', content: 'Partial' },
      ]);
    });

    it('saves the partial reply when the consumer stops reading early', async () => {
      createCompletion.mockResolvedValue(streamOf(['Par', 'tial']));

      const stream = service.streamReply(conversation, 'hi');
      await stream.next();
      await stream.return(undefined);

      expect(messages.insert).toHaveBeenCalledWith([
        { ...conversation, role: 'user', content: 'hi' },
        { ...conversation, role: 'assistant', content: 'Par' },
      ]);
    });

    it('saves nothing when no reply was received', async () => {
      createCompletion.mockResolvedValue(streamOf([]));

      await collect(service.streamReply(conversation, 'hi'));

      expect(messages.insert).not.toHaveBeenCalled();
    });
  });
});
