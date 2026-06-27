import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, reports } from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { VALID_REASONS } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reason } = body;
  if (!reason || typeof reason !== "string" || reason.trim().length === 0 || reason.length > 255) {
    return NextResponse.json({ error: "reason は 1〜255 文字で入力してください" }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason.trim() as typeof VALID_REASONS[number])) {
    return NextResponse.json({ error: "無効な通報理由" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt), gt(posts.hiddenAt, sql`NOW()`)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const reporterId = Number(session.user.id);

  const [alreadyReported] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.postId, postId), eq(reports.reporterId, reporterId)))
    .limit(1);
  if (alreadyReported) {
    return NextResponse.json({ error: "すでに通報済みです" }, { status: 409 });
  }

  await db.insert(reports).values({
    postId,
    reporterId,
    reason: reason.trim(),
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
