import Anthropic from "@anthropic-ai/sdk";

export interface CompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface Provider {
  complete(system: string, userMessage: string): Promise<CompletionResult>;
}

export class AnthropicProvider implements Provider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(
    system: string,
    userMessage: string,
  ): Promise<CompletionResult> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find(
      (block) => block.type === "text",
    );
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response received from Claude");
    }

    return {
      text: textBlock.text,
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  }
}

interface OllamaStreamChunk {
  model?: string;
  choices?: Array<{
    delta?: { content?: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// With stream: false, Node's fetch (undici) kills the request after 300s
// waiting for response HEADERS, and Ollama only sends headers once the FULL
// completion is generated. Large models on CPU routinely exceed that.
// Streaming gets headers immediately and tokens keep the connection alive,
// so the only failure mode left is real inactivity.
const DEFAULT_IDLE_TIMEOUT_MS = 120_000;

export class OllamaProvider implements Provider {
  private model: string;
  private baseUrl: string;
  private idleTimeoutMs: number;

  constructor(model: string, baseUrl?: string, idleTimeoutMs?: number) {
    this.model = model;
    this.baseUrl = baseUrl ?? "http://localhost:11434";
    this.idleTimeoutMs = idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  }

  async complete(
    system: string,
    userMessage: string,
  ): Promise<CompletionResult> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const controller = new AbortController();
    let idleTimer = setTimeout(
      () => controller.abort(),
      this.idleTimeoutMs,
    );
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), this.idleTimeoutMs);
    };

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userMessage },
            ],
            temperature: 0,
            stream: true,
            stream_options: { include_usage: true },
          }),
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new OllamaTimeoutError(this.model, this.idleTimeoutMs);
        }
        const msg = error instanceof Error
          ? `${error.message}${error.cause instanceof Error ? ` (${error.cause.message})` : ""}`
          : "Cannot connect to Ollama";
        throw new OllamaConnectionError(msg);
      }

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 404) {
          throw new OllamaModelNotFoundError(this.model);
        }
        throw new OllamaConnectionError(
          `Ollama returned ${response.status}: ${body}`,
        );
      }

      if (!response.body) {
        throw new OllamaConnectionError("Ollama returned an empty stream");
      }

      let text = "";
      let model = this.model;
      let inputTokens = 0;
      let outputTokens = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          let done: boolean;
          let value: Uint8Array | undefined;
          try {
            ({ done, value } = await reader.read());
          } catch (error) {
            if (controller.signal.aborted) {
              throw new OllamaTimeoutError(this.model, this.idleTimeoutMs);
            }
            throw error;
          }
          if (done) break;
          resetIdle();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const payload = line.replace(/^data:\s*/, "").trim();
            if (!payload || payload === "[DONE]" || !line.startsWith("data:")) {
              continue;
            }
            let chunk: OllamaStreamChunk;
            try {
              chunk = JSON.parse(payload) as OllamaStreamChunk;
            } catch {
              continue; // tolerate malformed keep-alive lines
            }
            text += chunk.choices?.[0]?.delta?.content ?? "";
            if (chunk.model) model = chunk.model;
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens;
              outputTokens = chunk.usage.completion_tokens;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!text) {
        throw new Error("No response received from Ollama");
      }

      return { text, model, inputTokens, outputTokens };
    } finally {
      clearTimeout(idleTimer);
    }
  }
}

export class OllamaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaConnectionError";
  }
}

export class OllamaTimeoutError extends Error {
  constructor(model: string, idleTimeoutMs: number) {
    super(
      `Ollama produced no output for ${Math.round(idleTimeoutMs / 1000)}s running "${model}". ` +
        "The model may still be loading into memory. Try again (it stays warm), " +
        "or use a smaller model, e.g. --model ollama:qwen2.5-coder:1.5b",
    );
    this.name = "OllamaTimeoutError";
  }
}

export class OllamaModelNotFoundError extends Error {
  constructor(model: string) {
    super(
      `Model "${model}" not found. Run: ollama pull ${model}`,
    );
    this.name = "OllamaModelNotFoundError";
  }
}

export interface ModelConfig {
  provider: "anthropic" | "ollama";
  model: string;
}

export function parseModelFlag(value: string): ModelConfig {
  if (value.startsWith("ollama:")) {
    const model = value.slice("ollama:".length);
    if (!model) {
      throw new Error(
        "Invalid model format. Use: ollama:<model-name>",
      );
    }
    return { provider: "ollama", model };
  }

  return { provider: "anthropic", model: value };
}

export function createProvider(
  config: ModelConfig,
  apiKey?: string,
): Provider {
  if (config.provider === "ollama") {
    return new OllamaProvider(config.model);
  }

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY required for Claude models. Export it or use --model ollama:<model>",
    );
  }
  return new AnthropicProvider(apiKey, config.model);
}
