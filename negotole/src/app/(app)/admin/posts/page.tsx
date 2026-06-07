import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import PostDeleteButton from "./PostDeleteButton";

export default async function AdminPostsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const rows = await db
    .select()
    .from(posts)
    .where(isNull(posts.deletedAt))
    .orderBy(desc(posts.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">投稿管理</h1>
        <span className="text-slate-400 text-sm">{rows.length} 件</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400">投稿がありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-indigo-200">
                <th className="border border-slate-700 px-4 py-2 text-left">ID</th>
                <th className="border border-slate-700 px-4 py-2 text-left">ユーザーID</th>
                <th className="border border-slate-700 px-4 py-2 text-left">内容</th>
                <th className="border border-slate-700 px-4 py-2 text-left">投稿日時</th>
                <th className="border border-slate-700 px-4 py-2 text-left">表示終了</th>
                <th className="border border-slate-700 px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-300">{p.id}</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-300">{p.userId}</td>
                  <td className="border border-slate-700/50 px-4 py-2 max-w-xs truncate">{p.content}</td>
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400 text-xs whitespace-nowrap">
                    {p.createdAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2 text-slate-400 text-xs whitespace-nowrap">
                    {p.hiddenAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="border border-slate-700/50 px-4 py-2 text-center">
                    <PostDeleteButton postId={p.id} />
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
