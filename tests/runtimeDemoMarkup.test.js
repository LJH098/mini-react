import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime demo markup", () => {
  it("week5 service demo mentions login, like, and writing flows", () => {
    const html = readFileSync(resolve(process.cwd(), "runtime-demo.html"), "utf8");

    expect(html).toContain("로그인 체험");
    expect(html).toContain("좋아요");
    expect(html).toContain("글쓰기");
    expect(html).toContain("localStorage");
    expect(html).toContain("디버그 열기");
    expect(html).toContain("런타임 디버그 패널");
    expect(html).toContain("Timeline");
    expect(html).toContain("일시정지");
    expect(html).toContain("자동스크롤");
  });
});
