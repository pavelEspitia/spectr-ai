import { describe, it, expect } from "vitest";
import { validateContractFile } from "./validator.js";

describe("validateContractFile — Solidity", () => {
  it("accepts valid Solidity with pragma", () => {
    const result = validateContractFile(
      "Token.sol",
      "pragma solidity ^0.8.0;\ncontract Token {}",
    );
    expect(result).toEqual({ valid: true, language: "solidity" });
  });

  it("accepts contract without pragma", () => {
    const result = validateContractFile(
      "Token.sol",
      "contract Token { function foo() public {} }",
    );
    expect(result).toEqual({ valid: true, language: "solidity" });
  });

  it("accepts interface files", () => {
    const result = validateContractFile(
      "IToken.sol",
      "interface IToken { function name() external view returns (string); }",
    );
    expect(result).toEqual({ valid: true, language: "solidity" });
  });

  it("accepts library files", () => {
    const result = validateContractFile(
      "SafeMath.sol",
      "library SafeMath { function add(uint a, uint b) internal pure returns (uint) { return a + b; } }",
    );
    expect(result).toEqual({ valid: true, language: "solidity" });
  });

  it("rejects non-Solidity content in .sol", () => {
    const result = validateContractFile(
      "NotSolidity.sol",
      "function hello() { console.log('hi'); }",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not appear to be valid Solidity");
  });
});

describe("validateContractFile — Vyper", () => {
  it("accepts valid Vyper with @external", () => {
    const result = validateContractFile(
      "Token.vy",
      "@external\ndef transfer(to: address, amount: uint256):\n    pass",
    );
    expect(result).toEqual({ valid: true, language: "vyper" });
  });

  it("accepts Vyper with @version comment", () => {
    const result = validateContractFile(
      "Token.vy",
      "# @version ^0.3.7\nowner: address",
    );
    expect(result).toEqual({ valid: true, language: "vyper" });
  });

  it("accepts Vyper with event", () => {
    const result = validateContractFile(
      "Token.vy",
      "event Transfer:\n    sender: address\n    receiver: address",
    );
    expect(result).toEqual({ valid: true, language: "vyper" });
  });

  it("rejects non-Vyper content in .vy", () => {
    const result = validateContractFile(
      "NotVyper.vy",
      "hello world this is not vyper",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not appear to be valid Vyper");
  });
});

describe("validateContractFile — common", () => {
  it("rejects unsupported extension", () => {
    const result = validateContractFile("readme.md", "contract Foo {}");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not a .sol or .vy file");
  });

  it("rejects empty content", () => {
    const result = validateContractFile("Empty.sol", "   ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });
});
