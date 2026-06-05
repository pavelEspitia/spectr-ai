import type { ContractLanguage } from "./validator.js";

export interface ChainInfo {
  name: string;
  chainId: number;
}

// Etherscan V2: one endpoint + one API key for every supported chain, selected
// via the `chainid` query param.
export const SUPPORTED_CHAINS: Record<string, ChainInfo> = {
  ethereum: { name: "Ethereum", chainId: 1 },
  base: { name: "Base", chainId: 8453 },
  arbitrum: { name: "Arbitrum", chainId: 42161 },
  polygon: { name: "Polygon", chainId: 137 },
  optimism: { name: "Optimism", chainId: 10 },
  sepolia: { name: "Sepolia (testnet)", chainId: 11155111 },
};

const EXPLORER_API = "https://api.etherscan.io/v2/api";
const EXPLORER_KEY_ENV = "ETHERSCAN_API_KEY";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export class ChainFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainFetchError";
  }
}

export interface FetchedContract {
  source: string;
  name: string;
  language: ContractLanguage;
  chain: string;
  address: string;
}

interface SourcecodeResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  Implementation: string;
  Proxy: string;
}

interface ExplorerResponse {
  status: string;
  message: string;
  result: SourcecodeResult[] | string;
}

export function isContractAddress(value: string): boolean {
  return ADDRESS_RE.test(value);
}

export function getChainNames(): Array<{ id: string; name: string }> {
  return Object.entries(SUPPORTED_CHAINS).map(([id, info]) => ({
    id,
    name: info.name,
  }));
}

// Etherscan returns multi-file verified contracts as Standard JSON Input wrapped
// in double braces, single-brace JSON source maps, or a plain source string. This
// flattens every shape into one annotated source blob for the analyzer.
export function flattenSource(rawSourceCode: string): string {
  const trimmed = rawSourceCode.trim();

  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
    const inner = JSON.parse(trimmed.slice(1, -1)) as {
      sources?: Record<string, { content?: string }>;
    };
    return joinSources(inner.sources);
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const parsed = JSON.parse(trimmed) as Record<string, { content?: string }>;
    return joinSources(parsed);
  }

  return trimmed;
}

function joinSources(
  sources: Record<string, { content?: string }> | undefined,
): string {
  if (!sources) {
    throw new ChainFetchError("verified source contained no files");
  }
  const parts: string[] = [];
  for (const [path, file] of Object.entries(sources)) {
    if (file.content) {
      parts.push(`// ===== ${path} =====\n${file.content}`);
    }
  }
  if (parts.length === 0) {
    throw new ChainFetchError("verified source contained no files");
  }
  return parts.join("\n\n");
}

function detectLanguage(compilerVersion: string): ContractLanguage {
  return compilerVersion.toLowerCase().startsWith("vyper")
    ? "vyper"
    : "solidity";
}

async function requestSourcecode(
  address: string,
  chainId: number,
  apiKey: string,
): Promise<SourcecodeResult> {
  const url = new URL(EXPLORER_API);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ChainFetchError(
      `network error reaching the block explorer: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
  }

  if (!response.ok) {
    throw new ChainFetchError(
      `block explorer returned HTTP ${response.status}`,
    );
  }

  const data = (await response.json()) as ExplorerResponse;
  if (data.status !== "1" || typeof data.result === "string") {
    const detail = typeof data.result === "string" ? data.result : data.message;
    throw new ChainFetchError(
      `block explorer rejected the request: ${detail || "unknown error"}`,
    );
  }

  const entry = data.result[0];
  if (!entry) {
    throw new ChainFetchError("no contract found at that address");
  }
  return entry;
}

/**
 * Fetches the verified source of a deployed contract from an EVM chain.
 *
 * Reads from the chain via the Etherscan V2 explorer API. When the address is a
 * proxy, the verified implementation source is fetched and used instead.
 *
 * @param address - 0x-prefixed contract address.
 * @param chain - Supported chain id (e.g. "ethereum", "base", "sepolia").
 * @returns The flattened source, contract name, and detected language.
 * @throws ChainFetchError if the chain is unsupported, the API key is missing,
 *   the address is malformed, or the contract source is not verified.
 */
export async function fetchContractSource(
  address: string,
  chain: string,
): Promise<FetchedContract> {
  const info = SUPPORTED_CHAINS[chain];
  if (!info) {
    const supported = Object.keys(SUPPORTED_CHAINS).join(", ");
    throw new ChainFetchError(
      `unsupported chain "${chain}". Supported: ${supported}`,
    );
  }

  if (!isContractAddress(address)) {
    throw new ChainFetchError(`"${address}" is not a valid contract address`);
  }

  const apiKey = process.env[EXPLORER_KEY_ENV];
  if (!apiKey) {
    throw new ChainFetchError(
      `${EXPLORER_KEY_ENV} not set. Get a free key at https://etherscan.io/apis`,
    );
  }

  let entry = await requestSourcecode(address, info.chainId, apiKey);

  const impl = entry.Implementation;
  if (entry.Proxy === "1" && impl && isContractAddress(impl)) {
    entry = await requestSourcecode(impl, info.chainId, apiKey);
  }

  if (
    !entry.SourceCode ||
    entry.SourceCode === "Contract source code not verified"
  ) {
    throw new ChainFetchError(
      `contract at ${address} on ${info.name} is not verified — no source to audit`,
    );
  }

  return {
    source: flattenSource(entry.SourceCode),
    name: entry.ContractName || address,
    language: detectLanguage(entry.CompilerVersion),
    chain: info.name,
    address,
  };
}
