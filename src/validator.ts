import { extname } from "node:path";

const SOLIDITY_KEYWORDS =
  /(pragma\s+solidity|contract\s+\w|interface\s+\w|library\s+\w)/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSolidityFile(
  filePath: string,
  content: string,
): ValidationResult {
  if (extname(filePath) !== ".sol") {
    return {
      valid: false,
      error: `"${filePath}" is not a .sol file`,
    };
  }

  if (content.trim().length === 0) {
    return {
      valid: false,
      error: `"${filePath}" is empty`,
    };
  }

  if (!SOLIDITY_KEYWORDS.test(content)) {
    return {
      valid: false,
      error: `"${filePath}" does not appear to be valid Solidity (no pragma, contract, interface, or library found)`,
    };
  }

  return { valid: true };
}
