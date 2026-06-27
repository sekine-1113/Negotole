import { auth } from "@/lib/auth";
import { MyPostsList } from "@/components/MyPostsList";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export default async function MyPostsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = Number(session.user.id);

  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      hiddenAt: posts.hiddenAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const serialized = items.map((r) => ({
    id: r.id,
    content: r.content,
    hiddenAt: r.hiddenAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <section className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-indigo-100">自分の投稿履歴</h2>
            <p className="text-xs text-slate-400">あなたが投稿した寝言の一覧</p>
          </div>
          <Link href="/mypage" className="text-xs text-indigo-400 hover:text-indigo-200 transition">
            ← マイページ
          </Link>
        </div>

        <MyPostsList initialPosts={serialized} initialNextCursor={nextCursor} />
      </section>
    </main>
  );
}
