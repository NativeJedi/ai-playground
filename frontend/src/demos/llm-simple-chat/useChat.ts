import { useEffect, useState } from 'react'
import { ChatService, type ChatMessage } from './ChatService.ts'

// React state on top of ChatService.
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lazy initializer: one instance for the whole life of the component.
  const [service] = useState(
    () =>
      new ChatService({
        onMessages: setMessages,
        onError: (err) => setError(err.message),
      }),
  )

  useEffect(() => {
    service.mount()
    return () => service.unmount()
  }, [service])

  async function sendMessage(content: string) {
    if (isStreaming) return

    setError(null)
    setIsStreaming(true)
    await service.send(content)
    setIsStreaming(false)
  }

  function clear() {
    setError(null)
    void service.clear()
  }

  function stop() {
    service.abort()
  }

  return { messages, isStreaming, error, sendMessage, clear, stop }
}
