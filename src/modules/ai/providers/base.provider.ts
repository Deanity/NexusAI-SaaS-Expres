export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string | null;
  stream?: boolean;
}

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  finishReason: string;
}

export interface BaseProvider {
  chat(
    messages: ProviderMessage[],
    model: string,
    options: ProviderOptions
  ): Promise<ProviderResponse>;

  chatStream?(
    messages: ProviderMessage[],
    model: string,
    options: ProviderOptions,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse>;
}
