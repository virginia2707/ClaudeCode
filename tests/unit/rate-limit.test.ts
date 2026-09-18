import { describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const key = "test:" + Math.random();
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("se réinitialise avec resetRateLimit", () => {
    const key = "test:" + Math.random();
    for (let i = 0; i < 4; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
  });
});
