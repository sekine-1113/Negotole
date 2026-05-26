import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminCampaignsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(isNull(campaigns.deletedAt))
    .orderBy(desc(campaigns.createdAt));

  const items = rows.map((c) => ({
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
        <p className="text-gray-500">キャンペーンがありません。</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">名前</th>
              <th className="border px-4 py-2 text-left">開始日時</th>
              <th className="border px-4 py-2 text-left">終了日時</th>
              <th className="border px-4 py-2 text-right">付与pt</th>
              <th className="border px-4 py-2 text-center">状態</th>
              <th className="border px-4 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{c.name}</td>
                <td className="border px-4 py-2">{c.startsAt.toLocaleString("ja-JP")}</td>
                <td className="border px-4 py-2">{c.endsAt.toLocaleString("ja-JP")}</td>
                <td className="border px-4 py-2 text-right">{c.bonusPoints}pt</td>
                <td className="border px-4 py-2 text-center">
                  {c.isActive ? (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                      アクティブ
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      非アクティブ
                    </span>
                  )}
                </td>
                <td className="border px-4 py-2 text-center">
                  <Link
                    href={`/admin/campaigns/${c.id}/edit`}
                    className="text-blue-600 hover:underline text-xs"
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
    </div>
  );
}
