import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, gt, gte, isNull, lt, lte, sql } from "drizzle-orm";

export type FetchPostsOptions = {
  cursorId?: number | null;
  sinceId?: number | null;
  limit?: number;
  order?: "newest" | "random";
};

// ブラインドポスト設計原則: userId は意図的に含まない
export type PostRow = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

export type FetchPostsResult = {
  posts: PostRow[];
  nextCursor: string | null;
  totalActive: number;
  expiredToday: number;
};

export async function fetchPosts({ cursorId, sinceId, limit = 20, order = "newest" }: FetchPostsOptions = {}): Promise<FetchPostsResult> {
  const effectiveLimit = Math.min(limit, 50);

  const activeCondition = and(
    gt(posts.hiddenAt, sql`NOW()`),
    isNull(posts.deletedAt),
  );

  const [rows, countResult, expiredTodayResult] = await Promise.all([
    db
      .select({
        id: posts.id,
        content: posts.content,
        hiddenAt: posts.hiddenAt,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        and(
          activeCondition,
          order !== "random" && cursorId ? lt(posts.id, cursorId) : undefined,
          sinceId ? gt(posts.id, sinceId) : undefined,
        )
      )
      .orderBy(order === "random" ? sql`RANDOM()` : sql`${posts.id} DESC`)
      .limit(effectiveLimit + 1),
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(posts)
      .where(activeCondition),
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(posts)
      .where(and(
        isNull(posts.deletedAt),
        lte(posts.hiddenAt, sql`NOW()`),
        gte(posts.hiddenAt, sql`((NOW() AT TIME ZONE 'Asia/Tokyo')::date AT TIME ZONE 'Asia/Tokyo')`),
      )),
  ]);

  const totalActive = Number(countResult[0]?.count ?? 0);
  const expiredToday = Number(expiredTodayResult[0]?.count ?? 0);
  const hasMore = rows.length > effectiveLimit;
  const raw = hasMore ? rows.slice(0, effectiveLimit) : rows;
  const nextCursor =
    hasMore ? Buffer.from(String(raw[raw.length - 1].id)).toString("base64") : null;

  const serialized = raw.map((r) => ({
    id: r.id,
    content: r.content,
    hiddenAt: r.hiddenAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return { posts: serialized, nextCursor, totalActive, expiredToday };
}

export async function getPostHourDistribution(userId: number): Promise<number[]> {
  const rows = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${posts.createdAt} AT TIME ZONE 'Asia/Tokyo')::int`,
      cnt: sql<number>`COUNT(*)::int`,
    })
    .from(posts)
    .where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
    .groupBy(sql`EXTRACT(HOUR FROM ${posts.createdAt} AT TIME ZONE 'Asia/Tokyo')`)
    .orderBy(sql`EXTRACT(HOUR FROM ${posts.createdAt} AT TIME ZONE 'Asia/Tokyo')`);

  const result = new Array(24).fill(0) as number[];
  for (const row of rows) {
    if (row.hour >= 0 && row.hour < 24) result[row.hour] = row.cnt;
  }
  return result;
}

export async function getRandomExpiredPost(userId: number): Promise<{ content: string } | null> {
  const [row] = await db
    .select({ content: posts.content })
    .from(posts)
    .where(and(
      eq(posts.userId, userId),
      isNull(posts.deletedAt),
      lte(posts.hiddenAt, sql`NOW()`),
    ))
    .orderBy(sql`RANDOM()`)
    .limit(1);
  return row ?? null;
}
