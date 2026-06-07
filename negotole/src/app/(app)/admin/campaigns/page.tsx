import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { and, desc, isNull, lt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { cursor } = await searchParams;
  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (Number.isSafeInteger(decoded) && decoded > 0) {
      cursorId = decoded;
    }
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(isNull(campaigns.deletedAt), cursorId ? lt(campaigns.id, cursorId) : undefined))
    .orderBy(desc(campaigns.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const raw = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(raw[raw.length - 1].id)).toString("base64")
    : null;

  const items = raw.map((c) => ({
    ...c,
    isActive: c.startsAt <= now && c.endsAt >= now,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">キャンペーン一覧</h1>
        <Link
          href="/admin/campaigns/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          新規作成
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400">キャンペーンがありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-indigo-200">
                <th className="border border-slate-700 px-4 py-2 text-left">名前</th>
                <th className="border border-slate-700 px-4 py-2 text-left">開始日時</th>
                <th className="border border-slate-700 px-4 py-2 text-left">終了日時</th>
                <th className="border border-slate-700 px-4 py-2 text-right">付与pt</th>
                <th className="border border-slate-700 px-4 py-2 text-center">状態</th>
                <th className="border border-slate-700 px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="border border-slate-700/50 px-4 py-2">{c.name}</td>
                  <td className="border border-slate-700/50 px-4 py-2">{c.startsAt.toLocaleString("ja-JP")}</td>
                  <td className="border border-slate-700/50 px-4 py-2">{c.endsAt.toLocaleString("ja-JP")}</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-right">{c.bonusPoints}pt</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-center">
                    {c.isActive ? (
                      <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-medium">
                        アクティブ
                      </span>
                    ) : (
                      <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
                        非アクティブ
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2 text-center">
                    <Link
                      href={`/admin/campaigns/${c.id}/edit`}
                      className="text-indigo-400 hover:text-indigo-200 hover:underline text-xs transition"
                    >
                      編集
                    </Link>
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
            href={`/admin/campaigns?cursor=${nextCursor}`}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-100 rounded transition"
          >
            次のページ →
          </Link>
        </div>
      )}
    </div>
  );
}
