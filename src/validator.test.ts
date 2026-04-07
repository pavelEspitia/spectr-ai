import { describe, it, expect } from "vitest";
import { validateSolidityFile } from "./validator.js";

describe("validateSolidityFile", () => {
  it("accepts valid Solidity with pragma", () => {
    const result = validateSolidityFile(
      "Token.sol",
      'pragma solidity ^0.8.0;\ncontract Token {}',
    );
    expect(result).toEqual({ valid: true });
  });

  it("accepts contract without pragma", () => {
    const result = validateSolidityFile(
      "Token.sol",
      "contract Token { function foo() public {} }",
    );
    expect(result).toEqual({ valid: true });
  });

  it("accepts interface files", () => {
    const result = validateSolidityFile(
      "IToken.sol",
      "interface IToken { function name() external view returns (string); }",
    );
    expect(result).toEqual({ valid: true });
  });

  it("accepts library files", () => {
    const result = validateSolidityFile(
      "SafeMath.sol",
      "library SafeMath { function add(uint a, uint b) internal pure returns (uint) { return a + b; } }",
    );
    expect(result).toEqual({ valid: true });
  });

  it("rejects non-.sol extension", () => {
    const result = validateSolidityFile("readme.md", "contract Foo {}");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not a .sol file");
  });

  it("rejects empty content", () => {
    const result = validateSolidityFile("Empty.sol", "   ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects non-Solidity content", () => {
    const result = validateSolidityFile(
      "NotSolidity.sol",
      "function hello() { console.log('hi'); }",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not appear to be valid Solidity");
  });
});
