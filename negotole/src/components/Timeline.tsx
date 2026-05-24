"use client";

import { useState } from "react";
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
};

export function Timeline({ initialPosts, initialNextCursor }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?cursor=${nextCursor}`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.length === 0 && (
        <p className="text-center text-gray-400 py-12">まだ投稿がありません</p>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
