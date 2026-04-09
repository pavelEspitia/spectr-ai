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

interface OllamaResponse {
  model: string;
  choices: Array<{
    message: { content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OllamaProvider implements Provider {
  private model: string;
  private baseUrl: string;

  constructor(model: string, baseUrl?: string) {
    this.model = model;
    this.baseUrl = baseUrl ?? "http://localhost:11434";
  }

  async complete(
    system: string,
    userMessage: string,
  ): Promise<CompletionResult> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        temperature: 0,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 404) {
        throw new OllamaModelNotFoundError(this.model);
      }
      throw new OllamaConnectionError(
        `Ollama returned ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as OllamaResponse;
    const text = data.choices[0]?.message.content;

    if (!text) {
      throw new Error("No response received from Ollama");
    }

    return {
      text,
      model: data.model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}

export class OllamaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaConnectionError";
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
