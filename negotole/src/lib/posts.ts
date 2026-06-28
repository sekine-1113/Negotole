import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, gt, isNull, lt, sql } from "drizzle-orm";

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
};

export async function fetchPosts({ cursorId, sinceId, limit = 20, order = "newest" }: FetchPostsOptions = {}): Promise<FetchPostsResult> {
  const effectiveLimit = Math.min(limit, 50);

  const activeCondition = and(
    gt(posts.hiddenAt, sql`NOW()`),
    isNull(posts.deletedAt),
  );

  const [rows, countResult] = await Promise.all([
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
  ]);

  const totalActive = Number(countResult[0]?.count ?? 0);
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

  return { posts: serialized, nextCursor, totalActive };
}
