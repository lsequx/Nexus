import { NextResponse } from "next/server";

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const configured = process.env.NEXUS_APP_ORIGIN;
  const expected = configured || `${url.protocol}//${request.headers.get("host") || url.host}`;
  // Hostnames outside loopback require an explicit deployment origin. This also
  // prevents a DNS-rebinding page from using local operator registration.
  if (origin && !configured && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(expected).hostname)) {
    throw new RequestError("Configure the application origin before external access.", 403);
  }
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== expected)) {
    throw new RequestError("Cross-origin requests are not allowed.", 403);
  }
}

export async function readJsonBody(request: Request, limit = 16384): Promise<Record<string, unknown>> {
  requireSameOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("Use application/json.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("A JSON body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new RequestError("Request body is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new RequestError("Invalid JSON body.", 400); }
}

export function requestError(error: unknown) {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}

const windows = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, maximum: number, duration: number) {
  const now = Date.now();
  for (const [name, window] of windows) if (window.expires <= now) windows.delete(name);
  let window = windows.get(key);
  if (!window) {
    if (windows.size >= 10000) throw new RequestError("Too many requests. Try again later.", 429);
    window = { count: 0, expires: now + duration };
    windows.set(key, window);
  }
  if (++window.count > maximum) throw new RequestError("Too many requests. Try again later.", 429);
}
