import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, reports, users } from "@/lib/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
  const cursor = searchParams.get("cursor");
  const onlyUnresolved = searchParams.get("unresolved") === "1";

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (!Number.isSafeInteger(decoded) || decoded <= 0) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorId = decoded;
  }

  const rows = await db
    .select({
      id: reports.id,
      postId: reports.postId,
      postContent: posts.content,
      reporterName: users.name,
      reason: reports.reason,
      resolvedAt: reports.resolvedAt,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .leftJoin(posts, eq(reports.postId, posts.id))
    .leftJoin(users, eq(reports.reporterId, users.id))
    .where(
      and(
        cursorId ? lt(reports.id, cursorId) : undefined,
        onlyUnresolved ? isNull(reports.resolvedAt) : undefined
      )
    )
    .orderBy(desc(reports.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const serialized = items.map((r) => ({
    id: r.id,
    postId: r.postId,
    postContent: r.postContent ?? null,
    reporterName: r.reporterName ?? "不明",
    reason: r.reason,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ reports: serialized, nextCursor });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "number") {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  const reportId = body.id;
  const [existing] = await db
    .select({ id: reports.id, resolvedAt: reports.resolvedAt })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await db
    .update(reports)
    .set({ resolvedAt: new Date() })
    .where(and(eq(reports.id, reportId), isNull(reports.resolvedAt)));

  return NextResponse.json({ success: true });
}
