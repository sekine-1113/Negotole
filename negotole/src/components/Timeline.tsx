"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "./PostCard";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

type Filter = "all" | "soon" | "medium" | "later";

const POLL_INTERVAL_MS = 30_000;

function remainingMs(hiddenAt: string): number {
  return new Date(hiddenAt).getTime() - Date.now();
}

function applyFilter(posts: Post[], filter: Filter): Post[] {
  if (filter === "all") return posts;
  return posts.filter((p) => {
    const ms = remainingMs(p.hiddenAt);
    if (filter === "soon") return ms > 0 && ms < 3_600_000;
    if (filter === "medium") return ms >= 3_600_000 && ms < 21_600_000;
    if (filter === "later") return ms >= 21_600_000;
    return true;
  });
}

const FILTER_LABELS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "soon", label: "まもなく消える" },
  { value: "medium", label: "普通" },
  { value: "later", label: "まだある" },
];

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
  const [filter, setFilter] = useState<Filter>("all");
  const topPostIdRef = useRef<number | null>(initialPosts[0]?.id ?? null);

  const handleExpire = useCallback((id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    const poll = async () => {
      const sinceId = topPostIdRef.current;
      if (!sinceId) return;
      try {
        const since = Buffer.from(String(sinceId)).toString("base64");
        const res = await fetch(`/api/posts?since=${since}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.posts.length > 0) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = (data.posts as Post[]).filter((p) => !existingIds.has(p.id));
            if (newPosts.length === 0) return prev;
            const merged = [...newPosts, ...prev];
            topPostIdRef.current = merged[0].id;
            return merged;
          });
        }
      } catch {
        // サイレント失敗（ポーリングエラーは表示しない）
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      topPostIdRef.current = posts[0].id;
    }
  }, [posts]);

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

  const filteredPosts = applyFilter(posts, filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {FILTER_LABELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === value
                ? "bg-indigo-600/60 border-indigo-500/60 text-indigo-100"
                : "border-indigo-950/50 text-indigo-300/60 hover:border-indigo-700/50 hover:text-indigo-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 && posts.length === 0 && (
        <p className="text-center text-indigo-300/60 py-12">まだ投稿がありません</p>
      )}
      {filteredPosts.length === 0 && posts.length > 0 && (
        <p className="text-center text-indigo-300/60 py-12">このフィルターに該当する投稿がありません</p>
      )}
      {filteredPosts.map((post) => (
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
      {nextCursor && filter === "all" && (
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
