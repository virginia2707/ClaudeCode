import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isSameOriginRequest } from "./csrf";

function makeRequest(url: string, origin?: string): NextRequest {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  return new NextRequest(url, { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("accepts a request whose Origin matches the request's own origin", () => {
    const req = makeRequest("https://quizarena.example/api/games/1/answer", "https://quizarena.example");
    expect(isSameOriginRequest(req)).toBe(true);
  });

  it("rejects a request with no Origin header", () => {
    const req = makeRequest("https://quizarena.example/api/games/1/answer");
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("rejects a cross-origin Origin header", () => {
    const req = makeRequest("https://quizarena.example/api/games/1/answer", "https://evil.example");
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    const req = makeRequest("https://quizarena.example/api/games/1/answer", "not-a-url");
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("treats different ports as different origins", () => {
    const req = makeRequest("http://localhost:3000/api/games/1/answer", "http://localhost:4000");
    expect(isSameOriginRequest(req)).toBe(false);
  });

  it("accepts matching localhost origin used in local development", () => {
    const req = makeRequest("http://localhost:3000/api/games/1/answer", "http://localhost:3000");
    expect(isSameOriginRequest(req)).toBe(true);
  });
});
