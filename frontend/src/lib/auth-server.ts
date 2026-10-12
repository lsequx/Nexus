import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { privateDataDir, serverSecret } from "./secrets";

export type UserRole = "admin" | "operator" | "viewer";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  sessionVersion?: number;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const DATA_DIR = privateDataDir();
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(DATA_DIR, 0o700);
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  }
  fs.chmodSync(USERS_FILE, 0o600);
}

export function readUsers(): StoredUser[] {
  ensureDataDir();
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as StoredUser[];
  if (!Array.isArray(users)) throw new Error("Invalid user store");
  return users;
}

export function writeUsers(users: StoredUser[]) {
  ensureDataDir();
  const temp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(users, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, USERS_FILE);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashWithSalt(value: string, salt: string) {
  return crypto.scryptSync(value, salt, 64).toString("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    salt,
    hash: hashWithSalt(password, salt),
  };
}

const DUMMY_HASH = hashWithSalt("not-a-real-account", "nexus-dummy-salt");

export function verifyPassword(password: string, user?: StoredUser) {
  const attempted = Buffer.from(hashWithSalt(password, user?.passwordSalt ?? "nexus-dummy-salt"), "hex");
  const expected = Buffer.from(user?.passwordHash ?? DUMMY_HASH, "hex");
  const matches = attempted.length === expected.length && crypto.timingSafeEqual(attempted, expected);
  return Boolean(user) && matches;
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", serverSecret("NEXUS_SESSION_SECRET", "session-secret")).update(payload).digest("base64url");
}

export function createSessionToken(user: StoredUser) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      version: user.sessionVersion ?? 0,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      nonce: crypto.randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token?: string | null): StoredUser | null {
  if (!token || token.length > 4096) return null;
  if (token.split(".").length !== 2) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      exp: number;
      version: number;
    };

    if (typeof data.userId !== "string" || !Number.isSafeInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000) || !Number.isSafeInteger(data.version)) return null;
    const user = readUsers().find((user) => user.id === data.userId);
    return user && data.version === (user.sessionVersion ?? 0) ? user : null;
  } catch {
    return null;
  }
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export function revokeSessions(userId: string) {
  const users = readUsers();
  const user = users.find((item) => item.id === userId);
  if (user) { user.sessionVersion = (user.sessionVersion ?? 0) + 1; writeUsers(users); }
}

export const SESSION_COOKIE_NAME = "nexus_session";
export const SESSION_COOKIE_SECURE = process.env.NEXUS_COOKIE_SECURE === "false"
  ? false
  : process.env.NODE_ENV === "production";
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
