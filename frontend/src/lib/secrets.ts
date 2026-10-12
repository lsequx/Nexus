import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function privateDataDir() {
  return process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data");
}

export function serverSecret(variable: string, filename: string) {
  const configured = process.env[variable];
  if (configured !== undefined) {
    if (configured.length < 32 || configured === "nexus-local-development-secret-change-before-production") throw new Error(`${variable} must be a private random value of at least 32 characters.`);
    return configured;
  }
  const directory = privateDataDir();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const file = path.join(directory, filename);
  try {
    fs.writeFileSync(file, crypto.randomBytes(48).toString("base64url"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const value = fs.readFileSync(file, "utf8").trim();
  if (value.length < 32) throw new Error(`Invalid private key file: ${filename}`);
  return value;
}
