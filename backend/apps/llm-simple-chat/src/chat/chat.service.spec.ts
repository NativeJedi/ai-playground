import { ChatService } from './chat.service.js';

describe('ChatService', () => {
  it('replies as the assistant to the last message', () => {
    const reply = new ChatService().reply([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'second' },
    ]);

    expect(reply).toEqual({ role: 'assistant', content: 'You said: second' });
  });
});
