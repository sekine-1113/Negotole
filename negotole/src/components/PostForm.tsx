"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DURATIONS = [
  { label: "1時間", value: 60 },
  { label: "3時間", value: 180 },
  { label: "6時間", value: 360 },
  { label: "12時間", value: 720 },
  { label: "24時間", value: 1440 },
] as const;

type Props = {
  totalPoints: number;
};

export function PostForm({ totalPoints }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = content.trim().length > 0 && duration !== null && totalPoints >= 1 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), duration }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "投稿に失敗しました");
        return;
      }
      router.push("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={255}
          placeholder="今どうしてる？"
          rows={4}
          className="w-full border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="text-right text-sm text-gray-400">{content.length} / 255文字</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">表示時間</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                duration === d.value
                  ? "bg-black text-white border-black"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500">残ポイント: {totalPoints}pt（投稿に 1pt 消費）</p>

      {totalPoints < 1 && (
        <p className="text-sm text-red-500">ポイントが不足しています。明日また投稿できます。</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-2.5 rounded-full bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "投稿中..." : "投稿する"}
      </button>
    </form>
  );
}
