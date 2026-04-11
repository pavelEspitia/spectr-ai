import { z } from "zod";

const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

const issueSchema = z.object({
  severity: severitySchema,
  title: z.string(),
  location: z.string(),
  description: z.string(),
  recommendation: z.string(),
  codefix: z.string().optional(),
});

const jsonReportSchema = z.object({
  issues: z.array(issueSchema),
  summary: z.object({
    riskRating: severitySchema,
    counts: z.object({
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
      info: z.number(),
    }),
    topFixes: z.array(z.string()),
  }),
});

export type ValidatedReport = z.infer<typeof jsonReportSchema>;

export function parseReport(raw: string): ValidatedReport {
  const cleaned = raw.replace(/^```json\n?|\n?```$/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ReportParseError(
      `Invalid JSON from model. Response starts with: ${cleaned.slice(0, 100)}`,
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
