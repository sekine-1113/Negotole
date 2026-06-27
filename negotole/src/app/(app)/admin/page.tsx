import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, reports, userPoints, users } from "@/lib/db/schema";
import { and, count, gt, isNull, sum } from "drizzle-orm";
import { getJSTDayBounds } from "@/lib/points";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { todayStart } = getJSTDayBounds();
  const now = new Date();

  const results = await Promise.allSettled([
    db
      .select({ count: count() })
      .from(posts)
      .where(and(isNull(posts.deletedAt), gt(posts.createdAt, todayStart))),
    db
      .select({ count: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gt(users.createdAt, todayStart))),
    db
      .select({ count: count() })
      .from(posts)
      .where(and(isNull(posts.deletedAt), gt(posts.hiddenAt, now))),
    db
      .select({ total: sum(userPoints.getPoint) })
      .from(userPoints)
      .where(
        and(
          isNull(userPoints.deletedAt),
          gt(userPoints.getPoint, 0),
          gt(userPoints.createdAt, todayStart)
        )
      ),
    db
      .select({ count: count() })
      .from(reports)
      .where(isNull(reports.resolvedAt)),
  ]);

  const [todayPostsRow] = results[0].status === "fulfilled" ? results[0].value : [{ count: 0 }];
  const [newUsersRow] = results[1].status === "fulfilled" ? results[1].value : [{ count: 0 }];
  const [activePostsRow] = results[2].status === "fulfilled" ? results[2].value : [{ count: 0 }];
  const [totalPointsTodayRow] = results[3].status === "fulfilled" ? results[3].value : [{ total: null }];
  const [unresolvedReportsRow] = results[4].status === "fulfilled" ? results[4].value : [{ count: 0 }];

  const stats = [
    { label: "今日の投稿数", value: todayPostsRow?.count ?? 0, unit: "件", color: "indigo" },
    { label: "今日の新規ユーザー", value: newUsersRow?.count ?? 0, unit: "人", color: "purple" },
    { label: "現在アクティブな投稿", value: activePostsRow?.count ?? 0, unit: "件", color: "emerald" },
    { label: "今日付与ポイント合計", value: Number(totalPointsTodayRow?.total ?? 0), unit: "pt", color: "yellow" },
    { label: "未解決通報", value: unresolvedReportsRow?.count ?? 0, unit: "件", color: "red" },
  ] as const;

  const colorMap = {
    indigo: "border-indigo-500/30 text-indigo-300",
    purple: "border-purple-500/30 text-purple-300",
    emerald: "border-emerald-500/30 text-emerald-300",
    yellow: "border-yellow-500/30 text-yellow-300",
    red: "border-red-500/30 text-red-300",
  } as const;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <p className="text-slate-400 text-sm mb-6">
        集計基準: JST 当日 (0:00〜23:59)
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, unit, color }) => (
          <div
            key={label}
            className={`bg-slate-900/60 border rounded-2xl p-5 backdrop-blur-md ${colorMap[color]}`}
          >
            <p className="text-xs text-slate-400 mb-2">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black ${colorMap[color].split(" ")[1]}`}>
                {value.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
