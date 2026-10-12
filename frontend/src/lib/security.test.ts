import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { backendPathAllowed, mayWrite } from "./backend-permissions";
import { readJsonBody, rateLimit, requireSameOrigin } from "./request-security";

let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-security-")); vi.stubEnv("NEXUS_DATA_DIR", directory); vi.stubEnv("NEXUS_SESSION_SECRET", "unit-test-only-" + crypto.randomBytes(32).toString("hex")); vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); fs.rmSync(directory, { recursive: true, force: true }); });

describe("security boundaries", () => {
  it("disables production registration by default and never grants signup admin access", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXUS_ALLOW_SIGNUP", undefined);
    const { POST } = await import("../app/api/auth/signup/route");
    const request = () => new Request("http://localhost:3000/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test User", email: "first@example.invalid", password: "a-test-password-long-enough", role: "admin" }) });
    expect((await POST(request())).status).toBe(403);
    expect(fs.existsSync(path.join(directory, "users.json"))).toBe(false);
    vi.stubEnv("NEXUS_ALLOW_SIGNUP", "true");
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).user.role).toBe("operator");
  });
  it("allows only supported backend paths and roles", () => {
    expect(backendPathAllowed("events", "GET")).toBe(true);
    expect(backendPathAllowed("incidents/incident-1", "PATCH")).toBe(true);
    for (const path of ["../admin", "docs", "openapi.json", "https://evil.example", "events/../health"]) expect(backendPathAllowed(path, "GET")).toBe(false);
    expect(mayWrite("viewer")).toBe(false);
    expect(mayWrite("admin")).toBe(true);
  });
  it("rejects cross-site JSON requests and oversized streaming bodies", async () => {
    expect(() => requireSameOrigin(new Request("http://0.0.0.0:3000/api/auth/login", { headers: { Host: "localhost:3100", Origin: "http://localhost:3100" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://127.0.0.1:3000/api/auth/signup", { headers: { Host: "evil.example", Origin: "http://evil.example" } }))).toThrow(/application origin/);
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api/auth/login", { headers: { Origin: "https://evil.example" } }))).toThrow(/Cross-origin/);
    await expect(readJsonBody(new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }))).rejects.toMatchObject({ status: 415 });
    await expect(readJsonBody(new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: "x".repeat(17000) }) }))).rejects.toMatchObject({ status: 413 });
  });
  it("bounds repeated login attempts", () => {
    const key = crypto.randomUUID();
    rateLimit(key, 2, 60000); rateLimit(key, 2, 60000);
    expect(() => rateLimit(key, 2, 60000)).toThrow(/Too many/);
  });
  it("rejects malformed signed sessions and revokes old sessions", async () => {
    const auth = await import("./auth-server");
    const password = auth.hashPassword("a-valid-test-password");
    const user = { id: "user-1", name: "Test User", email: "test@example.invalid", role: "operator" as const, passwordSalt: password.salt, passwordHash: password.hash, createdAt: new Date().toISOString() };
    auth.writeUsers([user]);
    const token = auth.createSessionToken(user);
    expect(auth.verifySessionToken(token)?.id).toBe(user.id);
    expect(auth.verifySessionToken(token + ".extra")).toBeNull();
    const payload = Buffer.from(JSON.stringify({ userId: user.id, version: 0 })).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.NEXUS_SESSION_SECRET!).update(payload).digest("base64url");
    expect(auth.verifySessionToken(`${payload}.${signature}`)).toBeNull();
    auth.revokeSessions(user.id);
    expect(auth.verifySessionToken(token)).toBeNull();
  });
  it("persists unpredictable secrets and fails closed on a corrupt user store", async () => {
    vi.stubEnv("NEXUS_SESSION_SECRET", "");
    const { serverSecret } = await import("./secrets");
    expect(() => serverSecret("NEXUS_SESSION_SECRET", "session-secret")).toThrow(/private random/);
    vi.stubEnv("NEXUS_SESSION_SECRET", undefined);
    const first = serverSecret("NEXUS_SESSION_SECRET", "session-secret");
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(serverSecret("NEXUS_SESSION_SECRET", "session-secret")).toBe(first);
    fs.writeFileSync(path.join(directory, "users.json"), "corrupted");
    const auth = await import("./auth-server");
    expect(() => auth.readUsers()).toThrow();
  });
});
