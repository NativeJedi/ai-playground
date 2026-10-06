import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postSse, type SseEvent } from '../../lib/sse'
import { ChatService, PROVIDERS, type ChatMessage } from './ChatService.ts'

vi.mock('../../lib/sse')

const postSseMock = vi.mocked(postSse)
const fetchMock = vi.fn()

const MESSAGES_URL = 'http://localhost:3001/conversations/demo-conversation/messages'
const HEADERS = { 'X-User-Id': 'demo-user' }

const delta = (text: string): SseEvent => ({ event: 'message', data: JSON.stringify({ delta: text }) })
const done: SseEvent = { event: 'done', data: '{}' }

async function* eventStream(events: SseEvent[]): AsyncGenerator<SseEvent> {
  yield* events
}

// Emits the events, then stays open until the request is aborted, like a slow real stream.
function openStream(events: SseEvent[]): typeof postSse {
  return (_url, _body, options) =>
    (async function* () {
      yield* events
      await new Promise<never>((_, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'))
        if (options?.signal?.aborted) abort()
        options?.signal?.addEventListener('abort', abort)
      })
    })()
}

function respondWith(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

describe('ChatService', () => {
  const onMessages = vi.fn<(messages: ChatMessage[]) => void>()
  const onError = vi.fn<(error: Error) => void>()
  let service: ChatService

  const lastMessages = () => onMessages.mock.calls.at(-1)?.[0]

  async function mountWithHistory(history: ChatMessage[] = []) {
    fetchMock.mockResolvedValueOnce(respondWith(history))
    service.mount()
    await vi.waitFor(() => expect(onMessages).toHaveBeenCalled())
    onMessages.mockClear()
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    service = new ChatService({ onMessages, onError })
  })

  describe('mount', () => {
    it('loads the stored history and reports it', async () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ]
      fetchMock.mockResolvedValueOnce(respondWith(history))

      service.mount()

      await vi.waitFor(() => expect(onMessages).toHaveBeenCalledWith(history))
      expect(fetchMock).toHaveBeenCalledWith(MESSAGES_URL, { headers: HEADERS })
    })

    it('reports an error when the server rejects the request', async () => {
      fetchMock.mockResolvedValueOnce(respondWith([], 500))

      service.mount()

      await vi.waitFor(() =>
        expect(onError).toHaveBeenCalledWith(new Error('Request failed with status 500')),
      )
      expect(onMessages).not.toHaveBeenCalled()
    })

    it('reports an error when the network fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('offline'))

      service.mount()

      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('offline')))
    })
  })

  describe('send', () => {
    it.each(PROVIDERS)('posts the message with the %s provider and the user header', async (provider) => {
      await mountWithHistory()
      postSseMock.mockImplementation(() => eventStream([done]))

      await service.send('hi', provider)

      expect(postSseMock).toHaveBeenCalledWith(
        MESSAGES_URL,
        { content: 'hi', provider },
        { headers: HEADERS, signal: expect.any(AbortSignal) },
      )
    })

    it('shows the user message with an empty reply, then grows the reply per delta', async () => {
      await mountWithHistory([{ role: 'assistant', content: 'earlier' }])
      postSseMock.mockImplementation(() => eventStream([delta('Hel'), delta('lo'), done]))

      await service.send('hi', 'openai')

      const earlier: ChatMessage = { role: 'assistant', content: 'earlier' }
      const user: ChatMessage = { role: 'user', content: 'hi' }
      expect(onMessages.mock.calls.map(([messages]) => messages)).toEqual([
        [earlier, user, { role: 'assistant', content: '' }],
        [earlier, user, { role: 'assistant', content: 'Hel' }],
        [earlier, user, { role: 'assistant', content: 'Hello' }],
      ])
    })

    it('ignores everything after the done event', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(() => eventStream([delta('Hi'), done, delta('ignored')]))

      await service.send('hi', 'openai')

      expect(lastMessages()?.at(-1)?.content).toBe('Hi')
    })

    it('reports the message of an error event and keeps the partial reply', async () => {
      await mountWithHistory()
      const failed: SseEvent = { event: 'error', data: 'model overloaded' }
      postSseMock.mockImplementation(() => eventStream([delta('Par'), failed]))

      await service.send('hi', 'openai')

      expect(onError).toHaveBeenCalledWith(new Error('model overloaded'))
      expect(lastMessages()?.at(-1)).toEqual({ role: 'assistant', content: 'Par' })
    })

    it('removes the empty reply when the request fails before the first token', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(() => {
        throw new Error('Request failed with status 502')
      })

      await service.send('hi', 'openai')

      expect(onError).toHaveBeenCalledWith(new Error('Request failed with status 502'))
      expect(lastMessages()).toEqual([{ role: 'user', content: 'hi' }])
    })

    it('reports a generic error when something other than an Error is thrown', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(() => {
        throw 'boom'
      })

      await service.send('hi', 'openai')

      expect(onError).toHaveBeenCalledWith(new Error('Something went wrong'))
    })
  })

  describe('abort', () => {
    it('stops the reply without reporting an error and keeps what arrived', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(openStream([delta('Hel')]))

      const sending = service.send('hi', 'openai')
      await vi.waitFor(() => expect(lastMessages()?.at(-1)?.content).toBe('Hel'))
      service.abort()
      await sending

      expect(onError).not.toHaveBeenCalled()
      expect(lastMessages()?.at(-1)).toEqual({ role: 'assistant', content: 'Hel' })
    })

    it('drops the empty reply when aborted before the first token', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(openStream([]))

      const sending = service.send('hi', 'openai')
      service.abort()
      await sending

      expect(onError).not.toHaveBeenCalled()
      expect(lastMessages()).toEqual([{ role: 'user', content: 'hi' }])
    })

    it('aborts the reply in progress when a new message is sent', async () => {
      await mountWithHistory()
      postSseMock.mockImplementationOnce(openStream([delta('Hel')]))
      const first = service.send('one', 'openai')
      await vi.waitFor(() => expect(lastMessages()?.at(-1)?.content).toBe('Hel'))

      postSseMock.mockImplementationOnce(() => eventStream([delta('Second'), done]))
      await service.send('two', 'openai')
      await first

      expect(postSseMock.mock.calls[0][2]?.signal?.aborted).toBe(true)
      expect(onError).not.toHaveBeenCalled()
      expect(lastMessages()?.slice(-2)).toEqual([
        { role: 'user', content: 'two' },
        { role: 'assistant', content: 'Second' },
      ])
    })
  })

  describe('clear', () => {
    it('deletes the history on the server and empties the list', async () => {
      await mountWithHistory([{ role: 'user', content: 'hi' }])
      fetchMock.mockResolvedValueOnce(respondWith(null, 204))

      await service.clear()

      expect(fetchMock).toHaveBeenLastCalledWith(MESSAGES_URL, { method: 'DELETE', headers: HEADERS })
      expect(lastMessages()).toEqual([])
    })

    it('keeps the messages and reports an error when the server rejects it', async () => {
      await mountWithHistory([{ role: 'user', content: 'hi' }])
      fetchMock.mockResolvedValueOnce(respondWith(null, 500))

      await service.clear()

      expect(onError).toHaveBeenCalledWith(new Error('Request failed with status 500'))
      expect(onMessages).not.toHaveBeenCalled()
    })
  })

  describe('unmount', () => {
    it('aborts the reply in progress and silences the handlers', async () => {
      await mountWithHistory()
      postSseMock.mockImplementation(openStream([delta('Hel')]))
      const sending = service.send('hi', 'openai')
      await vi.waitFor(() => expect(lastMessages()?.at(-1)?.content).toBe('Hel'))
      onMessages.mockClear()

      service.unmount()
      await sending

      expect(postSseMock.mock.calls[0][2]?.signal?.aborted).toBe(true)
      expect(onMessages).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('does not report a history that arrives after unmounting', async () => {
      fetchMock.mockResolvedValueOnce(respondWith([{ role: 'user', content: 'hi' }]))

      service.mount()
      service.unmount()
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
      await Promise.resolve()

      expect(onMessages).not.toHaveBeenCalled()
    })
  })
})
