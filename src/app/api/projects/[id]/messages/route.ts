import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// Color derived from name — stable per user
function avatarColor(name: string) {
  const COLORS = ["#006D6B","#2563EB","#7C3AED","#D97706","#DC2626","#059669","#4F46E5","#0891B2"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Extract @mention names from content  (@Word or @"Full Name")
function extractMentions(content: string): string[] {
  const matches = content.match(/@([\w.]+|"[^"]+"|[\w\s]+(?=\s|$))/g) ?? [];
  return matches.map(m => m.slice(1).replace(/^"|"$/g, ""));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await db.project.findFirst({
      where: { id, organisationId: ctx.org.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ messages: [], hasMore: false });

    const { searchParams } = new URL(req.url);
    const since  = searchParams.get("since");
    const cursor = searchParams.get("cursor");

    const messages = await db.projectMessage.findMany({
      where: {
        projectId: id,
        ...(since  ? { createdAt: { gt: new Date(since) } } : {}),
        ...(cursor ? { createdAt: { lt: (await db.projectMessage.findUnique({ where: { id: cursor }, select: { createdAt: true } }))?.createdAt ?? new Date() } } : {}),
      },
      orderBy: { createdAt: since ? "asc" : "desc" },
      take: 50,
      include: {
        replyTo: { select: { id: true, content: true, userName: true } },
      },
    });

    const result = (since ? messages : [...messages].reverse()).map(m => ({
      id:           m.id,
      content:      m.content,
      type:         m.type,
      mentions:     m.mentions,
      userId:       m.userId,
      userName:     m.userName,
      userInitials: initials(m.userName),
      userColor:    avatarColor(m.userName),
      editedAt:     m.editedAt?.toISOString() ?? null,
      createdAt:    m.createdAt.toISOString(),
      replyTo:      m.replyTo ? {
        id:       m.replyTo.id,
        content:  m.replyTo.content.slice(0, 80),
        userName: m.replyTo.userName,
      } : null,
      isOwn: m.userId === ctx.user.id,
    }));

    return NextResponse.json({ messages: result, hasMore: !since && messages.length === 50 });
  } catch (error) {
    console.error("[messages GET]", error);
    return NextResponse.json({ messages: [], hasMore: false });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await db.project.findFirst({
      where: { id, organisationId: ctx.org.id },
      select: { id: true, name: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json() as {
      content: string;
      type?: "TEXT" | "SYSTEM" | "COMMAND";
      replyToId?: string;
    };

    const content = (body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: "Too long" }, { status: 400 });

    const userName = ctx.user.name ?? ctx.user.email;
    const mentions = extractMentions(content);

    const message = await db.projectMessage.create({
      data: {
        projectId: id,
        userId:    ctx.user.id,
        userName,
        content,
        type:      body.type ?? "TEXT",
        mentions,
        replyToId: body.replyToId ?? null,
      },
    });

    // Create alerts for mentioned users
    if (mentions.length > 0) {
      await db.alert.createMany({
        data: mentions.map(() => ({
          organisationId: ctx.org.id,
          projectId:      id,
          type:           "mention",
          level:          "info",
          title:          `${userName} mentioned you in ${project.name}`,
          detail:         content.slice(0, 200),
          action:         `Open ${project.name} chat`,
          read:           false,
        })),
      });
    }

    return NextResponse.json({
      message: {
        id:           message.id,
        content:      message.content,
        type:         message.type,
        mentions:     message.mentions,
        userId:       message.userId,
        userName:     message.userName,
        userInitials: initials(userName),
        userColor:    avatarColor(userName),
        editedAt:     null,
        createdAt:    message.createdAt.toISOString(),
        replyTo:      null,
        isOwn:        true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[messages POST]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
