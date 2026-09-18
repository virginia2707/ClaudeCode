import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/authz/permissions";

describe("permissions", () => {
  it("learner can play but cannot author missions", () => {
    expect(can("LEARNER", "progress:play")).toBe(true);
    expect(can("LEARNER", "mission:create")).toBe(false);
    expect(can("LEARNER", "evaluation:write")).toBe(false);
  });

  it("trainer can author and evaluate but cannot manage the organization", () => {
    expect(can("TRAINER", "mission:publish")).toBe(true);
    expect(can("TRAINER", "evaluation:validate_ai")).toBe(true);
    expect(can("TRAINER", "org:manage_members")).toBe(false);
  });

  it("admin has every permission", () => {
    for (const p of PERMISSIONS) expect(can("ADMIN", p)).toBe(true);
  });

  it("roles are strictly nested LEARNER ⊂ TRAINER ⊂ ADMIN", () => {
    for (const p of ROLE_PERMISSIONS.LEARNER) expect(ROLE_PERMISSIONS.TRAINER.has(p)).toBe(true);
    for (const p of ROLE_PERMISSIONS.TRAINER) expect(ROLE_PERMISSIONS.ADMIN.has(p)).toBe(true);
  });

  it("unknown role is denied and assertCan throws 403", () => {
    expect(can(null, "mission:read")).toBe(false);
    expect(() => assertCan("LEARNER", "mission:create")).toThrow(ForbiddenError);
    expect(() => assertCan("TRAINER", "mission:create")).not.toThrow();
  });
});
