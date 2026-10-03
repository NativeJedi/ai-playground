import { EventSourceParserStream } from 'eventsource-parser/stream'

export type SseEvent = { event: string; data: string }

type PostSseOptions = { headers?: Record<string, string>; signal?: AbortSignal }

export async function* postSse(
  url: string,
  body: unknown,
  { headers, signal }: PostSseOptions = {},
): AsyncGenerator<SseEvent> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield { event: value.event ?? 'message', data: value.data }
    }
  } finally {
    // Closes the connection if the caller stops reading early.
    await reader.cancel()
  }
}
