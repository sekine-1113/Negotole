"use client";

import { useCallback, useState } from "react";
import { PostCard } from "./PostCard";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

type Props = {
  initialPosts: Post[];
  initialNextCursor: string | null;
  isLoggedIn: boolean;
};

export function Timeline({ initialPosts, initialNextCursor, isLoggedIn }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExpire = useCallback((id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts?cursor=${nextCursor}`);
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

  return (
    <div className="flex flex-col gap-4">
      {posts.length === 0 && (
        <p className="text-center text-indigo-300/60 py-12">まだ投稿がありません</p>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLoggedIn={isLoggedIn}
          onExpire={() => handleExpire(post.id)}
        />
      ))}
      {error && (
        <p className="text-center text-red-400/80 text-sm py-2">{error}</p>
      )}
      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2.5 text-sm text-indigo-300/70 border border-indigo-950/50 rounded-2xl hover:bg-slate-900/40 backdrop-blur-sm disabled:opacity-50 transition"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
