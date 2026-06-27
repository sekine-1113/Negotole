"use client";

import { useState } from "react";

export function ClaimTransferSection() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transfer/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "引継ぎに失敗しました");
        return;
      }
      setSuccess(true);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-slate-950/40 rounded-xl border border-emerald-500/20 p-4">
        <p className="text-xs font-bold text-emerald-400 mb-1">✓ 引継ぎ完了</p>
        <p className="text-[11px] text-slate-400">ゲストのポイントを引き継ぎました。ページを更新するとポイントが反映されます。</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 rounded-xl border border-indigo-500/20 p-4">
      <p className="text-xs font-bold text-indigo-300 mb-1">ゲストのポイントを引き継ぐ</p>
      <p className="text-[11px] text-slate-400 mb-3">
        ゲストログイン時に発行した引継ぎコードを入力してください。
      </p>
      <form onSubmit={handleClaim} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXX"
          maxLength={8}
          className="font-mono flex-1 bg-slate-950 border border-indigo-950/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase tracking-widest"
        />
        <button
          type="submit"
          disabled={loading || code.trim().length !== 8}
          className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 transition disabled:opacity-50"
        >
          {loading ? "..." : "引き継ぐ"}
        </button>
      </form>
      {error && <p className="text-xs text-pink-400 mt-2">{error}</p>}
    </div>
  );
}
