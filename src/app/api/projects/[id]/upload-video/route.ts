import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const config = { api: { bodyParser: false } };

const ALLOWED = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only MP4, MOV and WebM files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 400 });
  }

  const ext    = file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
  const dir    = join(process.cwd(), "public", "uploads", ctx.org.id, id);
  const fname  = `brief-video.${ext}`;
  const fpath  = join(dir, fname);
  const pubUrl = `/uploads/${ctx.org.id}/${id}/${fname}`;

  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fpath, buf);

  // Persist videoUrl on FA if exists, or store on project
  await db.project.update({
    where: { id },
    data:  { briefText: `[video:${pubUrl}]` },
  });

  return NextResponse.json({ videoUrl: pubUrl });
}
