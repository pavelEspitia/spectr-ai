import { extname } from "node:path";

const SOLIDITY_KEYWORDS =
  /(pragma\s+solidity|contract\s+\w|interface\s+\w|library\s+\w)/;

const VYPER_KEYWORDS =
  /(@external|@internal|@view|@pure|@payable|#\s*@version|def\s+\w+|event\s+\w+|from\s+vyper)/;

export type ContractLanguage = "solidity" | "vyper";

const SUPPORTED_EXTENSIONS = new Set([".sol", ".vy"]);

export interface ValidationResult {
  valid: boolean;
  language?: ContractLanguage;
  error?: string;
}

export function validateContractFile(
  filePath: string,
  content: string,
): ValidationResult {
  const ext = extname(filePath);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `"${filePath}" is not a .sol or .vy file`,
    };
  }

  if (content.trim().length === 0) {
    return {
      valid: false,
      error: `"${filePath}" is empty`,
    };
  }

  if (ext === ".sol") {
    if (!SOLIDITY_KEYWORDS.test(content)) {
      return {
        valid: false,
        error: `"${filePath}" does not appear to be valid Solidity (no pragma, contract, interface, or library found)`,
      };
    }
    return { valid: true, language: "solidity" };
  }

  if (ext === ".vy") {
    if (!VYPER_KEYWORDS.test(content)) {
      return {
        valid: false,
        error: `"${filePath}" does not appear to be valid Vyper (no @external, @internal, def, or event found)`,
      };
    }
    return { valid: true, language: "vyper" };
  }

  return { valid: false, error: `Unsupported file: "${filePath}"` };
}

// Backward-compatible alias
export function validateSolidityFile(
  filePath: string,
  content: string,
): ValidationResult {
  return validateContractFile(filePath, content);
}
