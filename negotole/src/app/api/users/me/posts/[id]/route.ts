import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: posts.id, userId: posts.userId })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(eq(posts.id, postId));

  return NextResponse.json({ success: true });
}
