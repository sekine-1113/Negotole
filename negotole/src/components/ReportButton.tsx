"use client";

import { VALID_REASONS as REASONS } from "@/lib/constants";
import { useState } from "react";

type Props = {
  postId: number;
};

export function ReportButton({ postId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "通報に失敗しました");
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError("通報に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-slate-500 whitespace-nowrap">通報済み</span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-indigo-300/40 hover:text-indigo-300/70 transition-colors whitespace-nowrap"
        aria-label="この投稿を通報する"
      >
        通報
      </button>

      {open && (
        <div className="absolute right-0 bottom-6 z-50 w-48 bg-slate-900 border border-indigo-950/70 rounded-xl p-3 shadow-xl">
          <p className="text-[10px] text-slate-400 mb-2 font-bold">通報理由を選択</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-indigo-500"
                />
                <span className="text-xs text-slate-300">{r}</span>
              </label>
            ))}
            {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={!reason || loading}
                className="flex-1 text-xs bg-red-700/80 hover:bg-red-600 text-white rounded-lg py-1.5 disabled:opacity-50 transition"
              >
                {loading ? "送信中..." : "通報"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 text-xs border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg py-1.5 transition"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
