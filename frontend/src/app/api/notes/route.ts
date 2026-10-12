import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { readJsonBody, requestError, RequestError, rateLimit } from "@/lib/request-security";
import { mayWrite } from "@/lib/backend-permissions";
import { requireSession } from "@/lib/session-server";

const DATA_DIR = process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

type Note = { id: string; incidentId: string; eventId?: string; text: string; author: string; createdAt: string };

function readNotes(): Note[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, "[]\n", { mode: 0o600 });
  return JSON.parse(fs.readFileSync(NOTES_FILE, "utf8")) as Note[];
}
function writeNotes(notes: Note[]) {
  const temporary = `${NOTES_FILE}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(notes, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, NOTES_FILE);
}

export async function GET(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const incidentId = new URL(request.url).searchParams.get("incidentId");
  return NextResponse.json(readNotes().filter((note) => !incidentId || note.incidentId === incidentId));
}

export async function POST(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mayWrite(user.role)) return NextResponse.json({ error: "Operator access required" }, { status: 403 });
  try {
    rateLimit(`notes:${user.id}`, 30, 60_000);
    const body = await readJsonBody(request);
    if (typeof body.incidentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.incidentId) || typeof body.text !== "string" || !body.text.trim() || body.text.length > 4000 || (body.eventId !== undefined && (typeof body.eventId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.eventId)))) throw new RequestError("A valid incident and note of at most 4000 characters are required.", 400);
    const note: Note = { id: crypto.randomUUID(), incidentId: body.incidentId, eventId: typeof body.eventId === "string" ? body.eventId : undefined, text: body.text.trim(), author: user.name, createdAt: new Date().toISOString() };
    const notes = readNotes(); notes.push(note); writeNotes(notes);
    return NextResponse.json(note, { status: 201 });
  } catch (error) { return requestError(error); }
}
