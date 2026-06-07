import { fetchPosts } from "@/lib/posts";
import { posts, userPoints } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { postWriteLimiter } from "@/lib/ratelimit";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const VALID_DURATIONS = [60, 180, 360, 720, 1440] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") ?? 20);

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (!Number.isSafeInteger(decoded) || decoded <= 0) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorId = decoded;
  }

  const result = await fetchPosts({ cursorId, limit });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (postWriteLimiter) {
    try {
      const { success } = await postWriteLimiter.limit(`user:${userId}`);
      if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    } catch (e) {
      log("warn", "ratelimit.check_failed", { userId, error: String(e) });
    }
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

  const hiddenAt = new Date(Date.now() + duration * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    // FOR UPDATE はサブクエリで行ロックし、外側で集計する
    const balanceRows = await tx.execute(sql`
      SELECT COALESCE(SUM(get_point), 0) AS total
      FROM (
        SELECT get_point
        FROM user_point
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        FOR UPDATE
      ) locked
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
    log("warn", "post.insufficient_points", { userId });
    return NextResponse.json({ error: "Insufficient points" }, { status: 402 });
  }

  log("info", "post.created", { userId, postId: result.id });
  revalidateTag(`user-points-${userId}`, "max");

  return NextResponse.json({ post: result }, { status: 201 });
}
