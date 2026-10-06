import { postSse } from '../../lib/sse'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

// Must match the providers the backend accepts.
export const PROVIDERS = ['openai', 'ollama'] as const
export type Provider = (typeof PROVIDERS)[number]

type ChatServiceHandlers = {
  // Called with the full, up-to-date list every time it changes.
  onMessages: (messages: ChatMessage[]) => void
  onError: (error: Error) => void
}

// Hardcoded until auth and a conversation list exist.
const USER_ID = 'demo-user'
const CONVERSATION_ID = 'demo-conversation'

const MESSAGES_URL = `http://localhost:3001/conversations/${CONVERSATION_ID}/messages`
const HEADERS = { 'X-User-Id': USER_ID }

function assertOk(response: Response) {
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
}

// Owns the conversation: talks to the chat API, keeps the message list
// and reports every change through the handlers passed to the constructor.
export class ChatService {
  private readonly handlers: ChatServiceHandlers
  private messages: ChatMessage[] = []
  private controller: AbortController | null = null
  private mounted = false

  constructor(handlers: ChatServiceHandlers) {
    this.handlers = handlers
  }

  // Starts reporting to the handlers and loads the stored history.
  mount() {
    this.mounted = true
    void this.loadHistory()
  }

  // Stops the reply in progress and silences the handlers.
  unmount() {
    this.mounted = false
    this.abort()
  }

  // Resolves when the reply ends for any reason: completed, failed or aborted.
  async send(content: string, provider: Provider): Promise<void> {
    this.abort()
    this.dropEmptyReply()
    const controller = new AbortController()
    this.controller = controller

    this.setMessages([
      ...this.messages,
      { role: 'user', content },
      { role: 'assistant', content: '' },
    ])
    try {
      const events = postSse(
        MESSAGES_URL,
        { content, provider },
        { headers: HEADERS, signal: controller.signal },
      )
      for await (const { event, data } of events) {
        if (event === 'error') throw new Error(data)
        if (event === 'done') break
        this.appendToReply((JSON.parse(data) as { delta: string }).delta)
      }
    } catch (error) {
      // An abort is requested by the caller, so it is not reported as an error.
      if (!controller.signal.aborted) this.reportError(error)
    } finally {
      // A superseded request leaves the messages to the one that replaced it.
      if (this.controller === controller) {
        this.controller = null
        this.dropEmptyReply()
      }
    }
  }

  // Stops the reply that is currently streaming, if any.
  abort() {
    this.controller?.abort()
  }

  async clear(): Promise<void> {
    try {
      assertOk(await fetch(MESSAGES_URL, { method: 'DELETE', headers: HEADERS }))
      this.setMessages([])
    } catch (error) {
      this.reportError(error)
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const response = await fetch(MESSAGES_URL, { headers: HEADERS })
      assertOk(response)
      this.setMessages(await response.json())
    } catch (error) {
      this.reportError(error)
    }
  }

  private appendToReply(delta: string) {
    const reply = this.messages[this.messages.length - 1]
    this.setMessages([
      ...this.messages.slice(0, -1),
      { ...reply, content: reply.content + delta },
    ])
  }

  // A reply that failed or was stopped before the first token leaves no bubble behind.
  private dropEmptyReply() {
    const last = this.messages[this.messages.length - 1]
    if (last?.role === 'assistant' && !last.content) this.setMessages(this.messages.slice(0, -1))
  }

  private setMessages(messages: ChatMessage[]) {
    this.messages = messages
    if (this.mounted) this.handlers.onMessages(messages)
  }

  private reportError(error: unknown) {
    if (!this.mounted) return
    this.handlers.onError(error instanceof Error ? error : new Error('Something went wrong'))
  }
}
