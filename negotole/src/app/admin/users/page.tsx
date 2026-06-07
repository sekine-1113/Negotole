import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { FreezeButton } from "./FreezeButton";

interface Props {
  searchParams: Promise<{ frozen?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { frozen } = await searchParams;
  const filterFrozen = frozen === "true";

  const query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.id);

  const rows = filterFrozen
    ? await query.where(isNotNull(users.bannedAt))
    : await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-100">ユーザー管理</h1>
        <a
          href={filterFrozen ? "/admin/users" : "/admin/users?frozen=true"}
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
            {rows.map((user) => (
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
        {rows.length === 0 && (
          <p className="text-slate-400 text-sm mt-4">
            {filterFrozen ? "凍結中のユーザーはいません" : "ユーザーが見つかりません"}
          </p>
        )}
      </div>
    </div>
  );
}
