import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseModelFlag,
  OllamaProvider,
  OllamaTimeoutError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
} from "./provider.js";

function sseStream(lines: string[], options?: { hangAfter?: number }) {
  const encoder = new TextEncoder();
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (options?.hangAfter !== undefined && sent >= options.hangAfter) {
        return new Promise(() => {}); // never resolves: simulates a hung server
      }
      if (sent < lines.length) {
        controller.enqueue(encoder.encode(lines[sent] + "\n"));
        sent += 1;
        return;
      }
      controller.close();
    },
  });
}

function chunk(content: string) {
  return `data: ${JSON.stringify({
    model: "qwen2.5-coder:7b",
    choices: [{ delta: { content } }],
  })}`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OllamaProvider streaming", () => {
  it("assembles text from SSE deltas and reads usage from the final chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          sseStream([
            chunk("Hello "),
            chunk("world"),
            `data: ${JSON.stringify({
              choices: [],
              usage: { prompt_tokens: 12, completion_tokens: 7 },
            })}`,
            "data: [DONE]",
          ]),
          { status: 200 },
        ),
      ),
    );

    const provider = new OllamaProvider("qwen2.5-coder:7b");
    const result = await provider.complete("sys", "user");

    expect(result.text).toBe("Hello world");
    expect(result.model).toBe("qwen2.5-coder:7b");
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(7);
  });

  it("requests a stream so slow generations are not killed waiting for headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseStream([chunk("ok"), "data: [DONE]"]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new OllamaProvider("m").complete("sys", "user");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init).toBeDefined();
    const body = JSON.parse(init?.body as string);
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("tolerates malformed keep-alive lines between chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          sseStream([chunk("a"), ": keep-alive", "data: {not json", chunk("b"), "data: [DONE]"]),
          { status: 200 },
        ),
      ),
    );

    const result = await new OllamaProvider("m").complete("sys", "user");
    expect(result.text).toBe("ab");
  });

  it("throws OllamaTimeoutError when the stream goes idle", async () => {
    const encoder = new TextEncoder();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) => {
        let sent = 0;
        // One chunk arrives, then the stream hangs; like real fetch, the
        // pending read rejects with AbortError when the signal fires.
        const stream = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (sent === 0) {
              sent += 1;
              controller.enqueue(encoder.encode(chunk("partial") + "\n"));
              return;
            }
            return new Promise((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted", "AbortError"));
              });
            });
          },
        });
        return Promise.resolve(new Response(stream, { status: 200 }));
      }),
    );

    const provider = new OllamaProvider("slow-model", undefined, 40);
    await expect(provider.complete("sys", "user")).rejects.toThrow(
      OllamaTimeoutError,
    );
  }, 5000);

  it("maps 404 to OllamaModelNotFoundError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("no model", { status: 404 })),
    );
    await expect(
      new OllamaProvider("missing").complete("s", "u"),
    ).rejects.toThrow(OllamaModelNotFoundError);
  });

  it("maps network failure to OllamaConnectionError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(
      new OllamaProvider("m").complete("s", "u"),
    ).rejects.toThrow(OllamaConnectionError);
  });
});

describe("parseModelFlag", () => {
  it("parses Anthropic model", () => {
    const config = parseModelFlag("claude-sonnet-4-6");
    expect(config).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("parses Ollama model", () => {
    const config = parseModelFlag("ollama:deepseek-coder-v2");
    expect(config).toEqual({
      provider: "ollama",
      model: "deepseek-coder-v2",
    });
  });

  it("parses Ollama model with slashes", () => {
    const config = parseModelFlag("ollama:qwen2.5-coder:7b");
    expect(config).toEqual({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
    });
  });

  it("throws on empty Ollama model name", () => {
    expect(() => parseModelFlag("ollama:")).toThrow(
      "Invalid model format",
    );
  });

  it("treats unknown models as Anthropic", () => {
    const config = parseModelFlag("claude-haiku-4-5-20251001");
    expect(config.provider).toBe("anthropic");
  });
});
