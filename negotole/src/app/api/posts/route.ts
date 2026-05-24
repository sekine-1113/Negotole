import { db } from "@/lib/db";
import { posts, userPoints } from "@/lib/db/schema";
import { and, gt, isNull, lt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const VALID_DURATIONS = [60, 180, 360, 720, 1440] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const cursorId = cursor ? Number(Buffer.from(cursor, "base64").toString()) : null;

  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      hiddenAt: posts.hiddenAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(
        gt(posts.hiddenAt, sql`NOW()`),
        isNull(posts.deletedAt),
        cursorId ? lt(posts.id, cursorId) : undefined
      )
    )
    .orderBy(sql`${posts.id} DESC`)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore ? Buffer.from(String(data[data.length - 1].id)).toString("base64") : null;

  return NextResponse.json({ posts: data, nextCursor });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, duration } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 255) {
    return NextResponse.json({ error: "content must be 1-255 characters" }, { status: 400 });
  }
  if (!VALID_DURATIONS.includes(duration)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const hiddenAt = new Date(Date.now() + duration * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    // ポイント残高をロックして取得（他リクエストの割り込みを防ぐ）
    const balanceRows = await tx.execute(sql`
      SELECT COALESCE(SUM(get_point), 0) AS total
      FROM user_point
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      FOR UPDATE
    `);
    const total = Number(((balanceRows as unknown) as { rows: { total: string }[] }).rows[0]?.total ?? 0);
    if (total < 1) {
      return null;
    }

    const [post] = await tx.insert(posts).values({
      userId,
      content: content.trim(),
      hiddenAt,
    }).returning();

    await tx.insert(userPoints).values({
      userId,
      getPoint: -1,
      expiresAt: null,
    });

    return post;
  });

  if (!result) {
    return NextResponse.json({ error: "Insufficient points" }, { status: 402 });
  }

  revalidatePath("/");
  revalidatePath("/post/new");

  return NextResponse.json({ post: result }, { status: 201 });
}
