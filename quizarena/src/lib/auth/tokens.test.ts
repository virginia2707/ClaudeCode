import { beforeAll, describe, expect, it } from "vitest";
import { signToken, verifyToken, type PlayerClaims, type SessionClaims } from "./tokens";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-vitest-only";
});

describe("signed tokens", () => {
  it("round-trips session claims", async () => {
    const token = await signToken({ kind: "session", userId: "u1", role: "TRAINER" }, "1h");
    const claims = await verifyToken<SessionClaims>(token, "session");
    expect(claims?.userId).toBe("u1");
    expect(claims?.role).toBe("TRAINER");
  });

  it("refuses a player token where a session token is expected", async () => {
    const token = await signToken({ kind: "player", gameId: "g1", playerId: "p1", token: "x" }, "1h");
    expect(await verifyToken<SessionClaims>(token, "session")).toBeNull();
    expect((await verifyToken<PlayerClaims>(token, "player"))?.playerId).toBe("p1");
  });

  it("refuses tampered and expired tokens", async () => {
    const token = await signToken({ kind: "session", userId: "u1", role: "TRAINER" }, "1h");
    expect(await verifyToken(token.slice(0, -2) + "zz", "session")).toBeNull();
    const expired = await signToken({ kind: "session", userId: "u1", role: "TRAINER" }, "-1s");
    expect(await verifyToken(expired, "session")).toBeNull();
  });
});
