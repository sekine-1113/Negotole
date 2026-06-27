"use client";

import { POST_COST_BY_DURATION } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";

const DURATIONS = [
  { label: "1h", value: 60 },
  { label: "3h", value: 180 },
  { label: "6h", value: 360 },
  { label: "12h", value: 720 },
  { label: "24h", value: 1440 },
] as const;

type Props = {
  totalPoints: number;
};

export function PostForm({ totalPoints }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState<number>(720);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = POST_COST_BY_DURATION[duration] ?? 1;
  const canSubmit = content.trim().length > 0 && totalPoints >= cost && !submitting;

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
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-5 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={255}
            placeholder="起きたら消えてしまう本音、深夜だけの独り言をささやこう..."
            rows={3}
            className="w-full bg-slate-950/80 border border-indigo-950/80 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none transition"
          />
          <p className="text-right text-xs text-slate-400 mt-1">{content.length} / 255文字</p>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-950/60 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-indigo-300 font-bold">漂う時間を選択:</span>
            <span className="text-xs text-slate-400">
              消費ポイント: <span className="text-amber-300 font-black text-sm">{cost}</span>{" "}
              <span className="text-[10px]">pt</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`py-2 rounded-lg border text-xs font-bold transition-all text-center ${
                  duration === d.value
                    ? "border-indigo-500/50 bg-indigo-950/40 text-indigo-200 shadow-md shadow-indigo-500/10"
                    : "border-indigo-950/80 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <span>{d.label}</span>
                <span className="block text-[9px] mt-0.5 opacity-60">{POST_COST_BY_DURATION[d.value]}pt</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">残ポイント: {totalPoints}pt</p>
          {totalPoints < cost && (
            <p className="text-xs text-pink-400">ポイント不足です</p>
          )}
        </div>

        {error && <p className="text-xs text-pink-400 mt-2">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting ? "投稿中..." : `寝言を放つ (${cost}pt)`}
        </button>
      </div>
    </form>
  );
}
