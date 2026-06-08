import { ProviderMessage, ProviderOptions, ProviderResponse, BaseProvider } from './base.provider';
import { env } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export class GoogleProvider implements BaseProvider {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = env.GOOGLE_AI_API_KEY;
    if (!this.apiKey || this.apiKey === 'mock_google_ai_api_key_replace_me') {
      console.warn('⚠ GOOGLE_AI_API_KEY is not set or is mock.');
    }
  }

  private mapMessages(messages: ProviderMessage[]): { role: string; parts: { text: string }[] }[] {
    return messages
      .filter((msg) => msg.role !== 'system') // System messages handled separately
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  private getSystemInstruction(
    messages: ProviderMessage[],
    options: ProviderOptions
  ): { parts: { text: string }[] } | undefined {
    // Collect system instructions
    const systemMessages = messages
      .filter((msg) => msg.role === 'system')
      .map((msg) => msg.content);
    if (options.systemPrompt) {
      systemMessages.unshift(options.systemPrompt);
    }

    if (systemMessages.length === 0) {
      return undefined;
    }

    return {
      parts: systemMessages.map((text) => ({ text })),
    };
  }

  async chat(
    messages: ProviderMessage[],
    model: string,
    options: ProviderOptions
  ): Promise<ProviderResponse> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const contents = this.mapMessages(messages);
    const systemInstruction = this.getSystemInstruction(messages, options);

    const payload = {
      contents,
      systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          `Google Gemini API error: ${response.status} - ${errorText}`,
          503,
          'AI_PROVIDER_ERROR'
        );
      }

      const data = (await response.json()) as GeminiResponse;
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';

      // Calculate token usage
      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const candidatesTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const tokensUsed = promptTokens + candidatesTokens;

      const finishReason = candidate?.finishReason || 'stop';

      return {
        content,
        tokensUsed: tokensUsed || Math.ceil((content.length + JSON.stringify(payload).length) / 4),
        finishReason,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Google Provider connection failed: ${(error as Error).message}`,
        503,
        'AI_PROVIDER_ERROR'
      );
    }
  }

  async chatStream(
    messages: ProviderMessage[],
    model: string,
    options: ProviderOptions,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    const url = `${this.baseUrl}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const contents = this.mapMessages(messages);
    const systemInstruction = this.getSystemInstruction(messages, options);

    const payload = {
      contents,
      systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          `Google Gemini API error: ${response.status} - ${errorText}`,
          503,
          'AI_PROVIDER_ERROR'
        );
      }

      if (!response.body) {
        throw new AppError(
          'Google Provider returned empty response body',
          503,
          'AI_PROVIDER_ERROR'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let tokensUsed = 0;
      let finishReason = 'stop';

      let isReading = true;
      while (isReading) {
        const { done, value } = await reader.read();
        if (done) {
          isReading = false;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Save the last incomplete line back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(jsonStr) as GeminiResponse;
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullContent += text;
                onChunk(text);
              }
              if (parsed.usageMetadata) {
                const prompt = parsed.usageMetadata.promptTokenCount || 0;
                const cand = parsed.usageMetadata.candidatesTokenCount || 0;
                tokensUsed = prompt + cand;
              }
              if (parsed.candidates?.[0]?.finishReason) {
                finishReason = parsed.candidates[0].finishReason;
              }
            } catch (e) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }

      // Process any remaining text in buffer
      if (buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice(6);
        try {
          const parsed = JSON.parse(jsonStr) as GeminiResponse;
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullContent += text;
            onChunk(text);
          }
          if (parsed.usageMetadata) {
            const prompt = parsed.usageMetadata.promptTokenCount || 0;
            const cand = parsed.usageMetadata.candidatesTokenCount || 0;
            tokensUsed = prompt + cand;
          }
          if (parsed.candidates?.[0]?.finishReason) {
            finishReason = parsed.candidates[0].finishReason;
          }
        } catch (e) {
          // ignore
        }
      }

      return {
        content: fullContent,
        tokensUsed: tokensUsed || Math.ceil(fullContent.length / 4),
        finishReason,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Google Provider connection failed: ${(error as Error).message}`,
        503,
        'AI_PROVIDER_ERROR'
      );
    }
  }
}
