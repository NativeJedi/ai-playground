import type { ComponentType } from 'react'
import { LlmSimpleChatPage } from './llm-simple-chat/LlmSimpleChatPage'

export type Demo = {
  path: string
  title: string
  description: string
  Page: ComponentType
}

export const demos: Demo[] = [
  {
    path: '/llm-simple-chat',
    title: 'Simple chat',
    description: 'A basic chat with the backend API.',
    Page: LlmSimpleChatPage,
  },
]
