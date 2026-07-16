import { z } from "zod";

const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

// Prose fields default to "" so a single omitted field from the model doesn't
// discard an otherwise complete report. Structural fields stay required.
const issueSchema = z.object({
  severity: severitySchema,
  title: z.string(),
  location: z.string().default(""),
  description: z.string().default(""),
  recommendation: z.string().default(""),
  codefix: z.string().optional(),
});

// Counts are derivable from the issues list, so a small model omitting a
// zero bucket (e.g. no "info" key) must not discard the whole report.
const jsonReportSchema = z.object({
  issues: z.array(issueSchema),
  summary: z.object({
    riskRating: severitySchema,
    counts: z.object({
      critical: z.number().default(0),
      high: z.number().default(0),
      medium: z.number().default(0),
      low: z.number().default(0),
      info: z.number().default(0),
    }),
    topFixes: z.array(z.string()).default([]),
  }),
});

export type ValidatedReport = z.infer<typeof jsonReportSchema>;

// Small local models rarely return bare JSON: they wrap it in prose
// ("Here is the audit report: ..."), fence it mid-response, or append
// commentary after the closing brace. Try progressively wider extractions
// and validate the first candidate that parses.
function extractJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates: string[] = [
    trimmed.replace(/^```(?:json)?\n?|\n?```$/g, "").trim(),
  ];

  const fenced = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n?\s*```/i);
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim());
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    candidates.push(trimmed.slice(first, last + 1));
  }

  // Last resort: small models often leave quotes unescaped inside code
  // snippets (e.g. call{value: amount}("")). Repair each candidate; the
  // result still has to pass schema validation to be accepted.
  const repaired = candidates.map(escapeUnterminatedQuotes);

  return [...new Set([...candidates, ...repaired])];
}

// Walks the text tracking string state. A quote inside a string only
// counts as the closing quote when the next non-whitespace character is a
// valid JSON delimiter; otherwise it is content the model forgot to escape.
function escapeUnterminatedQuotes(text: string): string {
  const DELIMITERS = new Set([",", "}", "]", ":"]);
  let out = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }

    if (ch === "\\") {
      out += ch + (text[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j] ?? "")) j += 1;
      const next = text[j];
      if (next === undefined || DELIMITERS.has(next)) {
        inString = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }

    out += ch;
  }

  return out;
}

export function parseReport(raw: string): ValidatedReport {
  let parsed: unknown;
  let found = false;
  for (const candidate of extractJsonCandidates(raw)) {
    try {
      parsed = JSON.parse(candidate);
      found = true;
      break;
    } catch {
      // try the next, wider extraction
    }
  }

  if (!found) {
    throw new ReportParseError(
      `Invalid JSON from model. Response starts with: ${raw.trim().slice(0, 100)}`,
    );
  }

  const result = jsonReportSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new ReportParseError(
      `Model returned invalid report structure:\n${issues}`,
    );
  }

  return result.data;
}

export class ReportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportParseError";
  }
}
