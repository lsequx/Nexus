import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type UserRole = "admin" | "operator" | "viewer";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const DATA_DIR = process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const SESSION_SECRET =
  process.env.NEXUS_SESSION_SECRET ||
  "nexus-local-development-secret-change-before-production";

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]\n", "utf8");
  }
}

export function readUsers(): StoredUser[] {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
}

export function writeUsers(users: StoredUser[]) {
  ensureDataDir();
  const temp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(users, null, 2)}\n`, "utf8");
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

export function verifyPassword(password: string, user: StoredUser) {
  const attempted = Buffer.from(hashWithSalt(password, user.passwordSalt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  return attempted.length === expected.length && crypto.timingSafeEqual(attempted, expected);
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

export function createSessionToken(user: StoredUser) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      nonce: crypto.randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token?: string | null): StoredUser | null {
  if (!token) return null;

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
    };

    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return readUsers().find((user) => user.id === data.userId) ?? null;
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

export function createResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashResetCode(code: string) {
  return crypto.createHash("sha256").update(`${SESSION_SECRET}:${code}`).digest("hex");
}

export const SESSION_COOKIE_NAME = "nexus_session";
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
