export const LLM_PROVIDERS = ['openai', 'ollama'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export abstract class LlmModelService {
  abstract streamChat(
    messages: LlmMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}
