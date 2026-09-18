import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }) }));

import { clientSubject, consume, resetRateLimits } from "@/lib/auth/rate-limit";

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("autorise jusqu'à la limite puis bloque dans la fenêtre", () => {
    const rule = { key: "t", limit: 3, windowMs: 1000 };
    expect(consume(rule, "ip", 0).allowed).toBe(true);
    expect(consume(rule, "ip", 10).allowed).toBe(true);
    expect(consume(rule, "ip", 20).allowed).toBe(true);
    const blocked = consume(rule, "ip", 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(970);
  });

  it("réinitialise après la fenêtre et isole les sujets", () => {
    const rule = { key: "t", limit: 1, windowMs: 1000 };
    expect(consume(rule, "a", 0).allowed).toBe(true);
    expect(consume(rule, "b", 0).allowed).toBe(true);
    expect(consume(rule, "a", 500).allowed).toBe(false);
    expect(consume(rule, "a", 1001).allowed).toBe(true);
  });

  it("prend la première IP de x-forwarded-for", async () => {
    expect(await clientSubject()).toBe("10.0.0.1");
  });
});
