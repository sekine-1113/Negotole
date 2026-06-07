import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminAuditLogs, posts } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const adminId = Number(session.user.id);
  const ip =
    _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    _req.headers.get("x-real-ip") ??
    null;

  await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(eq(posts.id, postId));

  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action: "post.delete",
      targetType: "post",
      targetId: postId,
      payload: { postId },
      ipAddress: ip,
    });
  } catch (e) {
    // audit log 書き込み失敗 → 論理削除をロールバック（FR-011）
    await db
      .update(posts)
      .set({ deletedAt: null })
      .where(eq(posts.id, postId));
    log("error", "post.delete_audit_failed", { postId, adminId, error: String(e) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  log("info", "post.deleted_by_admin", { postId, adminId });
  return NextResponse.json({ success: true });
}
