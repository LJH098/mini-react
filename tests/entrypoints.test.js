import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("browser entry points", () => {
  it("index hub links to both demos", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('href="/runtime-demo.html"');
    expect(html).toContain('href="/history-demo.html"');
  });
});
