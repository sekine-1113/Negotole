"use client";

import { useState } from "react";
import { DeletePostButton } from "./DeletePostButton";

type PostItem = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

type Props = {
  initialPosts: PostItem[];
  initialNextCursor: string | null;
};

function isExpired(hiddenAt: string): boolean {
  return new Date(hiddenAt).getTime() <= Date.now();
}

export function MyPostsList({ initialPosts, initialNextCursor }: Props) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDeleted(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/me/posts?cursor=${nextCursor}`);
      if (!res.ok) {
        setError("読み込みに失敗しました");
        return;
      }
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    } catch {
      setError("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (posts.length === 0) {
    return <p className="text-center text-indigo-300/60 py-8 text-sm">投稿がありません</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-indigo-950/40">
        {posts.map((post) => {
          const expired = isExpired(post.hiddenAt);
          return (
            <li key={post.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm whitespace-pre-wrap break-words flex-1 ${expired ? "text-slate-500 line-through" : "text-slate-100"}`}>
                  {post.content}
                </p>
                <DeletePostButton postId={post.id} onDeleted={handleDeleted} />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-slate-500">
                  投稿: {new Date(post.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                </span>
                {expired ? (
                  <span className="text-[10px] text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded">期限切れ</span>
                ) : (
                  <span className="text-[10px] text-indigo-400">
                    非表示: {new Date(post.hiddenAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-center text-red-400/80 text-sm py-2">{error}</p>}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition disabled:opacity-50"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
