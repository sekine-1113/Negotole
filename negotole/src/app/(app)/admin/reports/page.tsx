import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, reports, users } from "@/lib/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResolveReportButton } from "./ResolveReportButton";

const PAGE_SIZE = 50;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; unresolved?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { cursor, unresolved } = await searchParams;
  const onlyUnresolved = unresolved === "1";

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (Number.isSafeInteger(decoded) && decoded > 0) {
      cursorId = decoded;
    }
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
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">通報一覧</h1>
        <div className="flex items-center gap-3">
          <Link
            href={onlyUnresolved ? "/admin/reports" : "/admin/reports?unresolved=1"}
            className="text-xs px-3 py-1.5 border border-slate-700 rounded hover:bg-slate-800 text-slate-300 transition"
          >
            {onlyUnresolved ? "すべて表示" : "未解決のみ"}
          </Link>
          <span className="text-slate-400 text-sm">このページ {items.length} 件</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400">通報がありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-indigo-200">
                <th className="border border-slate-700 px-4 py-2 text-left">ID</th>
                <th className="border border-slate-700 px-4 py-2 text-left">投稿内容</th>
                <th className="border border-slate-700 px-4 py-2 text-left">通報理由</th>
                <th className="border border-slate-700 px-4 py-2 text-left">通報者</th>
                <th className="border border-slate-700 px-4 py-2 text-left">日時</th>
                <th className="border border-slate-700 px-4 py-2 text-center">状態</th>
                <th className="border border-slate-700 px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400">{row.id}</td>
                  <td className="border border-slate-700/50 px-4 py-2 max-w-[200px]">
                    <span className="text-slate-300 line-clamp-2 text-xs">
                      {row.postContent ?? <span className="text-slate-600">（削除済み）</span>}
                    </span>
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2">{row.reason}</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400">{row.reporterName ?? "不明"}</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400 whitespace-nowrap">
                    {row.createdAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2 text-center">
                    {row.resolvedAt ? (
                      <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">解決済み</span>
                    ) : (
                      <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-medium">未解決</span>
                    )}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2 text-center">
                    {!row.resolvedAt && <ResolveReportButton reportId={row.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/admin/reports?cursor=${nextCursor}${onlyUnresolved ? "&unresolved=1" : ""}`}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-100 rounded transition"
          >
            次のページ →
          </Link>
        </div>
      )}
    </div>
  );
}
