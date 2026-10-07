import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-server";

const DATA_DIR = process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

type Note = { id: string; incidentId: string; eventId?: string; text: string; author: string; createdAt: string };

function readNotes(): Note[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, "[]\n");
  try { return JSON.parse(fs.readFileSync(NOTES_FILE, "utf8")); } catch { return []; }
}
function writeNotes(notes: Note[]) { fs.writeFileSync(NOTES_FILE, `${JSON.stringify(notes, null, 2)}\n`); }

export async function GET(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const incidentId = new URL(request.url).searchParams.get("incidentId");
  return NextResponse.json(readNotes().filter((note) => !incidentId || note.incidentId === incidentId));
}

export async function POST(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { incidentId?: string; eventId?: string; text?: string };
  if (!body.incidentId || !body.text?.trim()) return NextResponse.json({ error: "Incident and note text are required." }, { status: 400 });
  const note: Note = { id: crypto.randomUUID(), incidentId: body.incidentId, eventId: body.eventId || undefined, text: body.text.trim(), author: user.name, createdAt: new Date().toISOString() };
  const notes = readNotes(); notes.push(note); writeNotes(notes);
  return NextResponse.json(note, { status: 201 });
}
