import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPoints } from "@/lib/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 30;

function formatPoint(pt: number): string {
  return pt > 0 ? `+${pt}pt` : `${pt}pt`;
}

function pointLabel(pt: number, expiresAt: Date | null): string {
  if (pt > 0 && expiresAt !== null) return "期間限定ポイント付与";
  if (pt > 0 && expiresAt === null) return "恒久ポイント付与";
  return "投稿消費";
}

export default async function PointHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = Number(session.user.id);
  const { cursor } = await searchParams;

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (Number.isSafeInteger(decoded) && decoded > 0) {
      cursorId = decoded;
    }
  }

  const rows = await db
    .select({
      id: userPoints.id,
      getPoint: userPoints.getPoint,
      expiresAt: userPoints.expiresAt,
      createdAt: userPoints.createdAt,
    })
    .from(userPoints)
    .where(
      and(
        eq(userPoints.userId, userId),
        isNull(userPoints.deletedAt),
        cursorId ? lt(userPoints.id, cursorId) : undefined
      )
    )
    .orderBy(desc(userPoints.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <section className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-indigo-100">ポイント履歴</h2>
            <p className="text-xs text-slate-400">取得・消費の時系列ログ</p>
          </div>
          <Link href="/mypage" className="text-xs text-indigo-400 hover:text-indigo-200 transition">
            ← マイページ
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-indigo-300/60 py-8 text-sm">履歴がありません</p>
        ) : (
          <ul className="divide-y divide-indigo-950/40">
            {items.map((row) => (
              <li key={row.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-300">{pointLabel(row.getPoint, row.expiresAt)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {row.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    row.getPoint > 0 ? "text-emerald-400" : "text-pink-400"
                  }`}
                >
                  {formatPoint(row.getPoint)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="mt-4 flex justify-end">
            <Link
              href={`/mypage/points?cursor=${nextCursor}`}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-100 rounded transition"
            >
              次のページ →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
