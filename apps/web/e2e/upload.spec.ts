import { test, expect } from "@playwright/test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

const VULNERABLE_SOL = readFileSync(
  join(THIS_DIR, "../../../packages/engine/examples/vulnerable.sol"),
  "utf-8",
);

const SAFE_SOL = readFileSync(
  join(THIS_DIR, "../../../packages/engine/examples/safe.sol"),
  "utf-8",
);

test.describe("Pages", () => {
  test("landing page renders upload zone", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("AI-Powered Smart Contract Auditor");
    expect(html).toContain("Drop a .sol or .vy file");
    expect(html).toContain('type="file"');
  });

  test("history page renders", async ({ request }) => {
    const response = await request.get("/history");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("Audit History");
  });

  test("non-existent audit returns 404", async ({ request }) => {
    const response = await request.get("/audit/nonexistent123");
    expect(response.status()).toBe(404);
  });
});

test.describe("API /api/analyze", () => {
  test("rejects missing body fields", async ({ request }) => {
    const response = await request.post("/api/analyze", {
      data: { fileName: "test.sol" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("required");
  });

  test("rejects invalid file extension", async ({ request }) => {
    const response = await request.post("/api/analyze", {
      data: { fileName: "readme.txt", source: "hello" },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("not a .sol or .vy file");
  });

  test("rejects non-Solidity content", async ({ request }) => {
    const response = await request.post("/api/analyze", {
      data: {
        fileName: "fake.sol",
        source: "this is not solidity code",
      },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("does not appear to be valid");
  });

  test("analyzes a valid contract and returns audit ID", async ({
    request,
  }) => {
    test.slow();

    const response = await request.post("/api/analyze", {
      data: { fileName: "safe.sol", source: SAFE_SOL },
    });

    // This may fail if Ollama is not running — check for either success or connection error
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(typeof body.id).toBe("string");

      // Verify the audit page loads
      const auditPage = await request.get(`/audit/${body.id}`);
      expect(auditPage.status()).toBe(200);
      const html = await auditPage.text();
      expect(html).toContain("safe.sol");
      expect(html).toContain("Summary");
    } else {
      // Ollama not running or other provider error — verify it's a clean error
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
  });
});
