"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "./PostCard";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

type Filter = "all" | "soon" | "medium" | "later" | "night";
type Order = "newest" | "random";

const POLL_INTERVAL_MS = 30_000;

const LS_KEYS = {
  hideCountdown: "negotole_hide_countdown",
  grayscale: "negotole_grayscale",
  hidePoints: "negotole_hide_points",
} as const;

const SILENCE_TEXTS = [
  "今夜は誰もいない",
  "静かな夜です",
  "言葉が眠っている",
  "ここには今、誰もいない",
];

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
    if (filter === "night") {
      const jstHour = (new Date(p.createdAt).getUTCHours() + 9) % 24;
      return jstHour >= 22 || jstHour < 5;
    }
    return true;
  });
}

const FILTER_LABELS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "soon", label: "まもなく消える" },
  { value: "medium", label: "普通" },
  { value: "later", label: "まだある" },
  { value: "night", label: "夜の寝言" },
];

type Props = {
  initialPosts: Post[];
  initialNextCursor: string | null;
  isLoggedIn: boolean;
  initialTotalActive: number;
};

export function Timeline({ initialPosts, initialNextCursor, isLoggedIn, initialTotalActive }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [order, setOrder] = useState<Order>("newest");
  const [totalActive, setTotalActive] = useState(initialTotalActive);
  const [showSettings, setShowSettings] = useState(false);
  const [hideCountdown, setHideCountdown] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [hidePoints, setHidePoints] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [silenceText, setSilenceText] = useState(SILENCE_TEXTS[0]);
  const maxSeenIdRef = useRef<number | null>(
    initialPosts.length > 0 ? Math.max(...initialPosts.map((p) => p.id)) : null
  );
  const marginRef = useRef<Map<number, number>>(new Map());
  const orderRef = useRef<Order>("newest");
  const isFirstOrderChange = useRef(true);

  useEffect(() => {
    setHideCountdown(localStorage.getItem(LS_KEYS.hideCountdown) === "1");
    setGrayscale(localStorage.getItem(LS_KEYS.grayscale) === "1");
    setHidePoints(localStorage.getItem(LS_KEYS.hidePoints) === "1");
    setSilenceText(SILENCE_TEXTS[Math.floor(Math.random() * SILENCE_TEXTS.length)]);
    setMounted(true);
  }, []);

  // order 変更時にランダムフェッチ（初回マウント時はスキップ）
  useEffect(() => {
    orderRef.current = order;
    if (isFirstOrderChange.current) {
      isFirstOrderChange.current = false;
      return;
    }
    if (order !== "random") return;

    let cancelled = false;
    const fetchRandom = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/posts?order=random&limit=20`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
        if (data.totalActive !== undefined) setTotalActive(data.totalActive);
        if (data.posts.length > 0) {
          const newMax = Math.max(...(data.posts as Post[]).map((p) => p.id));
          maxSeenIdRef.current = Math.max(maxSeenIdRef.current ?? 0, newMax);
        }
      } catch {
        if (!cancelled) setError("読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRandom();
    return () => { cancelled = true; };
  }, [order]);

  function toggleSetting(
    lsKey: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    current: boolean
  ) {
    const next = !current;
    localStorage.setItem(lsKey, next ? "1" : "0");
    setter(next);
    window.dispatchEvent(new StorageEvent("storage", { key: lsKey, newValue: next ? "1" : "0" }));
  }

  function getMargin(id: number): number {
    if (!marginRef.current.has(id)) {
      marginRef.current.set(id, Math.floor(Math.random() * 32) + 4);
    }
    return marginRef.current.get(id)!;
  }

  const handleExpire = useCallback((id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    const poll = async () => {
      if (orderRef.current === "random") return;
      const sinceId = maxSeenIdRef.current;
      if (!sinceId) return;
      try {
        const since = btoa(String(sinceId));
        const res = await fetch(`/api/posts?since=${since}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.totalActive !== undefined) setTotalActive(data.totalActive);
        if (data.posts.length > 0) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = (data.posts as Post[]).filter((p) => !existingIds.has(p.id));
            if (newPosts.length === 0) return prev;
            const merged = [...newPosts, ...prev];
            const newMax = Math.max(...merged.map((p) => p.id));
            maxSeenIdRef.current = newMax;
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
      const maxId = Math.max(...posts.map((p) => p.id));
      if (maxSeenIdRef.current === null || maxId > maxSeenIdRef.current) {
        maxSeenIdRef.current = maxId;
      }
    }
  }, [posts]);

  async function loadMore() {
    if (loading) return;
    if (order === "newest" && !nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        order === "random"
          ? `/api/posts?order=random&limit=20`
          : `/api/posts?cursor=${nextCursor}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError("読み込みに失敗しました");
        return;
      }
      const data = await res.json();
      if (data.totalActive !== undefined) setTotalActive(data.totalActive);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = (data.posts as Post[]).filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      if (order === "newest") setNextCursor(data.nextCursor);
      if (data.posts.length > 0) {
        const newMax = Math.max(...(data.posts as Post[]).map((p) => p.id));
        maxSeenIdRef.current = Math.max(maxSeenIdRef.current ?? 0, newMax);
      }
    } catch {
      setError("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const filteredPosts = applyFilter(posts, filter);
  const showLoadMore = order === "random" || (!!nextCursor && filter === "all");

  return (
    <div className="flex flex-col gap-4">
      {totalActive > 0 && (
        <p className="text-xs text-indigo-300/40 text-center py-1">今 {totalActive} 件の言葉が生きています</p>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setOrder((v) => (v === "random" ? "newest" : "random"))}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            order === "random"
              ? "bg-indigo-600/60 border-indigo-500/60 text-indigo-100"
              : "border-indigo-950/50 text-indigo-300/60 hover:border-indigo-700/50 hover:text-indigo-300"
          }`}
        >
          ランダム
        </button>
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
        <button
          onClick={() => setShowSettings((v) => !v)}
          className={`ml-auto text-xs px-3 py-1.5 rounded-full border transition ${
            showSettings
              ? "bg-indigo-600/60 border-indigo-500/60 text-indigo-100"
              : "border-indigo-950/50 text-indigo-300/60 hover:border-indigo-700/50 hover:text-indigo-300"
          }`}
          aria-label="表示設定"
        >
          表示設定
        </button>
      </div>

      {showSettings && (
        <div className="bg-slate-900/40 border border-indigo-950/50 rounded-xl p-3 flex flex-col gap-3">
          <p className="text-xs text-indigo-300/50 font-bold tracking-wide">表示設定</p>
          {[
            { label: "カウントダウンを非表示", value: hideCountdown, lsKey: LS_KEYS.hideCountdown, setter: setHideCountdown },
            { label: "モノクロ表示", value: grayscale, lsKey: LS_KEYS.grayscale, setter: setGrayscale },
            { label: "ポイント数を非表示", value: hidePoints, lsKey: LS_KEYS.hidePoints, setter: setHidePoints },
          ].map(({ label, value, lsKey, setter }) => (
            <label key={lsKey} className="flex items-center gap-3 cursor-pointer">
              <button
                role="switch"
                aria-checked={value}
                onClick={() => toggleSetting(lsKey, setter, value)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${value ? "bg-indigo-500" : "bg-slate-700"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
              <span className="text-xs text-indigo-200/80">{label}</span>
            </label>
          ))}
        </div>
      )}

      {filteredPosts.length === 0 && posts.length === 0 && !loading && (
        <p className="text-center text-indigo-300/50 py-12 text-sm italic">{silenceText}</p>
      )}
      {filteredPosts.length === 0 && posts.length > 0 && (
        <p className="text-center text-indigo-300/60 py-12">このフィルターに該当する投稿がありません</p>
      )}

      <div style={grayscale ? { filter: "grayscale(1)" } : {}}>
        {filteredPosts.map((post) => (
          <div key={post.id} style={{ marginBottom: mounted ? `${getMargin(post.id)}px` : "16px" }}>
            <PostCard
              post={post}
              isLoggedIn={isLoggedIn}
              onExpire={() => handleExpire(post.id)}
              showCountdown={!hideCountdown}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-center text-red-400/80 text-sm py-2">{error}</p>
      )}
      {showLoadMore && (
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
