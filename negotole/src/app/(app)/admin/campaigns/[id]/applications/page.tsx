import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignApplications, campaigns, users } from "@/lib/db/schema";
import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 50;

export default async function CampaignApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    redirect("/admin/campaigns");
  }

  const [campaign] = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), isNull(campaigns.deletedAt)))
    .limit(1);

  if (!campaign) {
    redirect("/admin/campaigns");
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(campaignApplications)
    .where(eq(campaignApplications.campaignId, campaignId));

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
      applicationId: campaignApplications.id,
      userId: campaignApplications.userId,
      userName: users.name,
      appliedAt: campaignApplications.createdAt,
    })
    .from(campaignApplications)
    .leftJoin(users, eq(campaignApplications.userId, users.id))
    .where(
      and(
        eq(campaignApplications.campaignId, campaignId),
        cursorId ? gt(campaignApplications.id, cursorId) : undefined
      )
    )
    .orderBy(asc(campaignApplications.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].applicationId)).toString("base64")
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">応募状況</h1>
          <p className="text-sm text-slate-400 mt-1">{campaign.name}</p>
        </div>
        <Link
          href={`/admin/campaigns/${campaignId}/edit`}
          className="text-indigo-400 hover:text-indigo-200 text-sm transition"
        >
          ← キャンペーン編集
        </Link>
      </div>

      <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700 inline-block">
        <span className="text-sm text-slate-400">総応募者数</span>
        <span className="ml-3 text-2xl font-bold text-indigo-200">{total}人</span>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400">応募者がいません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-indigo-200">
                <th className="border border-slate-700 px-4 py-2 text-left">No.</th>
                <th className="border border-slate-700 px-4 py-2 text-left">ユーザーID</th>
                <th className="border border-slate-700 px-4 py-2 text-left">ユーザー名</th>
                <th className="border border-slate-700 px-4 py-2 text-left">応募日時</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={row.applicationId} className="hover:bg-slate-800/50 transition-colors">
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400">
                    {(cursorId ?? 0) + i + 1}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2">{row.userId}</td>
                  <td className="border border-slate-700/50 px-4 py-2">{row.userName ?? "不明"}</td>
                  <td className="border border-slate-700/50 px-4 py-2">
                    {row.appliedAt.toLocaleString("ja-JP")}
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
            href={`/admin/campaigns/${campaignId}/applications?cursor=${nextCursor}`}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-100 rounded transition"
          >
            次のページ →
          </Link>
        </div>
      )}
    </div>
  );
}
