import { useState, type FormEvent } from 'react'
import { postJson } from '../../lib/api'
import { DemoLayout } from '../../layouts/DemoLayout'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ChatResponse = { message: ChatMessage }

const CHAT_URL = 'http://localhost:3001/chat'

export function LlmSimpleChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || isLoading) return

    const history: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(history)
    setInput('')
    setError(null)
    setIsLoading(true)
    try {
      const { message } = await postJson<ChatResponse>(CHAT_URL, { messages: history })
      setMessages([...history, message])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DemoLayout title="Simple chat" description="A basic chat with the backend API.">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === 'user'
                ? 'self-end rounded-lg bg-slate-900 px-3 py-2 text-white'
                : 'self-start rounded-lg bg-slate-100 px-3 py-2'
            }
          >
            {message.content}
          </div>
        ))}
        {isLoading && <p className="text-sm text-slate-400">Thinking…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </DemoLayout>
  )
}
