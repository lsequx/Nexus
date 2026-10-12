import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-server";
import { serverSecret } from "@/lib/secrets";
import { backendPathAllowed, mayWrite } from "@/lib/backend-permissions";
import { readJsonBody, requireSameOrigin, requestError, rateLimit } from "@/lib/request-security";

type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, context: Context) {
  try {
    const { path: segments } = await context.params;
    const path = segments.join("/");
    const method = request.method;
    if (!backendPathAllowed(path, method)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const health = path === "health" && method === "GET";
    if (!health) {
      const user = await requireSession();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      rateLimit(`backend:${user.id}`, 300, 60_000);
      if (method !== "GET") rateLimit(`backend-write:${user.id}`, 60, 60_000);
      if (method !== "GET" && !mayWrite(user.role)) return NextResponse.json({ error: "Operator access required" }, { status: 403 });
    }
    let body: string | undefined;
    if (method !== "GET") { requireSameOrigin(request); body = JSON.stringify(await readJsonBody(request)); }
    const response = await fetch(`http://127.0.0.1:8000/${path}${new URL(request.url).search}`, {
      method, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", "X-Nexus-Api-Key": serverSecret("NEXUS_BACKEND_KEY", "backend-key") },
    });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) { return requestError(error); }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
