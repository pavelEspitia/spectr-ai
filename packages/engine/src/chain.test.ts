import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChainFetchError,
  fetchContractSource,
  flattenSource,
  getChainNames,
  isContractAddress,
} from "./chain.js";

const ADDR = "0x1234567890123456789012345678901234567890";

function explorerOk(result: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ status: "1", message: "OK", result: [result] }),
  } as unknown as Response;
}

describe("isContractAddress", () => {
  it("accepts a checksummed 20-byte address", () => {
    expect(isContractAddress(ADDR)).toBe(true);
  });

  it("rejects non-addresses", () => {
    expect(isContractAddress("0x123")).toBe(false);
    expect(isContractAddress("not-an-address")).toBe(false);
    expect(isContractAddress("contracts/Token.sol")).toBe(false);
  });
});

describe("getChainNames", () => {
  it("lists every supported chain with a human name", () => {
    const ids = getChainNames().map((c) => c.id);
    expect(ids).toContain("ethereum");
    expect(ids).toContain("base");
    expect(ids).toContain("sepolia");
  });
});

describe("flattenSource", () => {
  it("returns a plain source string unchanged", () => {
    const src = "pragma solidity ^0.8.0;\ncontract A {}";
    expect(flattenSource(src)).toBe(src);
  });

  it("flattens double-brace Standard JSON Input", () => {
    const raw = `{{"sources":{"A.sol":{"content":"contract A {}"},"B.sol":{"content":"contract B {}"}}}}`;
    const out = flattenSource(raw);
    expect(out).toContain("// ===== A.sol =====");
    expect(out).toContain("contract A {}");
    expect(out).toContain("// ===== B.sol =====");
    expect(out).toContain("contract B {}");
  });

  it("flattens a single-brace source map", () => {
    const raw = `{"A.sol":{"content":"contract A {}"}}`;
    expect(flattenSource(raw)).toContain("contract A {}");
  });

  it("throws when a source map has no files", () => {
    expect(() => flattenSource(`{{"sources":{}}}`)).toThrow(ChainFetchError);
  });
});

describe("fetchContractSource", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    process.env["ETHERSCAN_API_KEY"] = "test-key";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["ETHERSCAN_API_KEY"];
  });

  it("rejects an unsupported chain", async () => {
    await expect(fetchContractSource(ADDR, "dogechain")).rejects.toThrow(
      /unsupported chain/,
    );
  });

  it("rejects a malformed address", async () => {
    await expect(fetchContractSource("0xabc", "ethereum")).rejects.toThrow(
      /not a valid contract address/,
    );
  });

  it("errors when the API key is missing", async () => {
    delete process.env["ETHERSCAN_API_KEY"];
    await expect(fetchContractSource(ADDR, "ethereum")).rejects.toThrow(
      /ETHERSCAN_API_KEY not set/,
    );
  });

  it("fetches verified Solidity source", async () => {
    fetchMock.mockResolvedValueOnce(
      explorerOk({
        SourceCode: "pragma solidity ^0.8.0;\ncontract Token {}",
        ContractName: "Token",
        CompilerVersion: "v0.8.20+commit.a1b79de6",
        Implementation: "",
        Proxy: "0",
      }),
    );

    const result = await fetchContractSource(ADDR, "ethereum");
    expect(result.name).toBe("Token");
    expect(result.language).toBe("solidity");
    expect(result.chain).toBe("Ethereum");
    expect(result.source).toContain("contract Token");
  });

  it("detects Vyper from the compiler version", async () => {
    fetchMock.mockResolvedValueOnce(
      explorerOk({
        SourceCode: "@external\ndef foo(): pass",
        ContractName: "Vault",
        CompilerVersion: "vyper:0.3.7",
        Implementation: "",
        Proxy: "0",
      }),
    );

    const result = await fetchContractSource(ADDR, "ethereum");
    expect(result.language).toBe("vyper");
  });

  it("follows a proxy to its implementation source", async () => {
    const impl = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    fetchMock
      .mockResolvedValueOnce(
        explorerOk({
          SourceCode: "contract Proxy {}",
          ContractName: "Proxy",
          CompilerVersion: "v0.8.20+commit.a1b79de6",
          Implementation: impl,
          Proxy: "1",
        }),
      )
      .mockResolvedValueOnce(
        explorerOk({
          SourceCode: "contract Logic {}",
          ContractName: "Logic",
          CompilerVersion: "v0.8.20+commit.a1b79de6",
          Implementation: "",
          Proxy: "0",
        }),
      );

    const result = await fetchContractSource(ADDR, "ethereum");
    expect(result.name).toBe("Logic");
    expect(result.source).toContain("contract Logic");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("errors when the contract is not verified", async () => {
    fetchMock.mockResolvedValueOnce(
      explorerOk({
        SourceCode: "Contract source code not verified",
        ContractName: "",
        CompilerVersion: "",
        Implementation: "",
        Proxy: "0",
      }),
    );

    await expect(fetchContractSource(ADDR, "ethereum")).rejects.toThrow(
      /not verified/,
    );
  });

  it("surfaces an explorer error status", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "0",
        message: "NOTOK",
        result: "Invalid API Key",
      }),
    } as unknown as Response);

    await expect(fetchContractSource(ADDR, "ethereum")).rejects.toThrow(
      /Invalid API Key/,
    );
  });
});
