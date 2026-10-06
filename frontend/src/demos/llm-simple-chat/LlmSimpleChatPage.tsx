import { useState, type FormEvent } from 'react'
import { DemoLayout } from '../../layouts/DemoLayout'
import { PROVIDERS, type Provider } from './ChatService'
import { useChat } from './useChat'

export function LlmSimpleChatPage() {
  const { messages, isStreaming, error, sendMessage, clear, stop } = useChat()
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<Provider>('openai')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || isStreaming) return

    setInput('')
    void sendMessage(content, provider)
  }

  return (
    <DemoLayout title="Simple chat" description="A streaming chat with history stored in Postgres.">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === 'user'
                ? 'self-end rounded-lg bg-slate-900 px-3 py-2 whitespace-pre-wrap text-white'
                : 'self-start rounded-lg bg-slate-100 px-3 py-2 whitespace-pre-wrap'
            }
          >
            {message.content || '…'}
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <div className="relative">
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as Provider)}
            disabled={isStreaming}
            aria-label="Model provider"
            className="h-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pr-9 pl-3 outline-none focus:border-slate-500 disabled:opacity-40"
          >
            {PROVIDERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
          >
            <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
          >
            Send
          </button>
        )}
        <button
          type="button"
          onClick={clear}
          disabled={isStreaming || messages.length === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 disabled:opacity-40"
        >
          Clear
        </button>
      </form>
    </DemoLayout>
  )
}
