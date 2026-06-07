import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, gt, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { FreezeButton } from "./FreezeButton";

const PAGE_LIMIT = 20;

interface Props {
  searchParams: Promise<{ frozen?: string; cursor?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { frozen, cursor } = await searchParams;
  const filterFrozen = frozen === "true";

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (Number.isSafeInteger(decoded) && decoded > 0) {
      cursorId = decoded;
    }
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        cursorId ? gt(users.id, cursorId) : undefined,
        filterFrozen ? isNotNull(users.bannedAt) : undefined,
      ),
    )
    .orderBy(users.id)
    .limit(PAGE_LIMIT + 1);

  const hasMore = rows.length > PAGE_LIMIT;
  const items = hasMore ? rows.slice(0, PAGE_LIMIT) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const nextParams = new URLSearchParams();
  if (nextCursor) nextParams.set("cursor", nextCursor);
  if (filterFrozen) nextParams.set("frozen", "true");

  const toggleFrozenHref = filterFrozen
    ? cursor ? `/admin/users` : `/admin/users`
    : `/admin/users?frozen=true`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-100">ユーザー管理</h1>
        <a
          href={toggleFrozenHref}
          className={`px-3 py-1 rounded text-sm transition ${
            filterFrozen
              ? "bg-indigo-700 text-white"
              : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          }`}
        >
          {filterFrozen ? "全ユーザーを表示" : "凍結中のみ"}
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700">
              <th className="pb-2 pr-4">ID</th>
              <th className="pb-2 pr-4">名前</th>
              <th className="pb-2 pr-4">メール</th>
              <th className="pb-2 pr-4">ロール</th>
              <th className="pb-2 pr-4">状態</th>
              <th className="pb-2 pr-4">登録日</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                <td className="py-2 pr-4 text-slate-400">{user.id}</td>
                <td className="py-2 pr-4 text-slate-100">{user.name}</td>
                <td className="py-2 pr-4 text-slate-400">{user.email ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      user.role === "admin"
                        ? "bg-indigo-900 text-indigo-200"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {user.bannedAt ? (
                    <span className="text-red-400 text-xs">
                      凍結中
                      <br />
                      <span className="text-slate-500">
                        {user.bannedAt.toLocaleDateString("ja-JP")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-xs">有効</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-slate-500 text-xs">
                  {user.createdAt.toLocaleDateString("ja-JP")}
                </td>
                <td className="py-2">
                  <FreezeButton userId={user.id} isFrozen={!!user.bannedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-slate-400 text-sm mt-4">
            {filterFrozen ? "凍結中のユーザーはいません" : "ユーザーが見つかりません"}
          </p>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-end">
          <a
            href={`/admin/users?${nextParams.toString()}`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition"
          >
            次のページへ →
          </a>
        </div>
      )}
    </div>
  );
}
