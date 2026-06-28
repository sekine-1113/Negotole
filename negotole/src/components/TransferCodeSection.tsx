"use client";

import { useState } from "react";

export function TransferCodeSection() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/transfer-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "コードの発行に失敗しました");
        return;
      }
      setCode(data.code);
      setExpiresAt(data.expiresAt);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bg-slate-950/40 rounded-xl border border-amber-500/20 p-4">
      <p className="text-xs font-bold text-amber-300 mb-1">ポイント引継ぎコード</p>
      <p className="text-[11px] text-slate-400 mb-3">
        正式アカウント（Google ログイン）に切り替える際に、このコードを入力するとポイントを引き継げます。
      </p>

      {code ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-black text-amber-300 tracking-widest bg-slate-950 px-3 py-2 rounded-lg border border-amber-500/30 flex-1 text-center">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-lg hover:bg-indigo-950/40 transition"
            >
              {copied ? "✓" : "コピー"}
            </button>
          </div>
          {expiresAt && (
            <p className="text-[10px] text-slate-500 text-center">
              有効期限: {new Date(expiresAt).toLocaleString("ja-JP")}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-[11px] text-slate-400 underline mt-1 text-center disabled:opacity-50"
          >
            コードを再発行する
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2 text-sm font-bold text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-950/30 transition disabled:opacity-50"
        >
          {loading ? "発行中..." : "引継ぎコードを発行する"}
        </button>
      )}

      {error && <p className="text-xs text-pink-400 mt-2">{error}</p>}
    </div>
  );
}
