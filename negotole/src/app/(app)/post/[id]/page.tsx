import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://negotole.vercel.app";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isSafeInteger(postId) || postId <= 0) return {};

  const [post] = await db
    .select({ content: posts.content })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt), gt(posts.hiddenAt, sql`NOW()`)))
    .limit(1);

  if (!post) return {};

  const description = post.content.slice(0, 100);
  const url = `${APP_URL}/post/${postId}`;

  return {
    title: `寝言 | negotole`,
    description,
    openGraph: {
      title: "negotole の寝言",
      description,
      url,
      siteName: "negotole",
      images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630 }],
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: "negotole の寝言",
      description,
      images: [`${APP_URL}/og-image.png`],
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isSafeInteger(postId) || postId <= 0) notFound();

  const [post] = await db
    .select({
      id: posts.id,
      content: posts.content,
      hiddenAt: posts.hiddenAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt), gt(posts.hiddenAt, sql`NOW()`)))
    .limit(1);

  if (!post) notFound();

  const postUrl = `${APP_URL}/post/${post.id}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`「${post.content.slice(0, 80)}」\n#negotole`)}&url=${encodeURIComponent(postUrl)}`;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-200 transition mb-6 inline-block">
        ← タイムラインに戻る
      </Link>

      <article className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        <p className="text-slate-100 whitespace-pre-wrap break-words text-base leading-relaxed mb-6">
          {post.content}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {new Date(post.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </span>
          <span className="text-indigo-400">
            非表示: {new Date(post.hiddenAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </span>
        </div>
      </article>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={twitterShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-black hover:bg-slate-900 text-white text-sm font-bold rounded-2xl transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X (Twitter) でシェア
        </a>
        <button
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(postUrl);
            }
          }}
          className="flex items-center justify-center gap-2 w-full py-3 border border-indigo-950/50 text-indigo-300 text-sm rounded-2xl hover:bg-slate-900/40 transition"
          suppressHydrationWarning
        >
          リンクをコピー
        </button>
      </div>
    </main>
  );
}
