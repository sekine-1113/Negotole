"use client";

import { VALID_REASONS as REASONS } from "@/lib/constants";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  postId: number;
};

export function ReportButton({ postId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPopupStyle({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

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

  const popup =
    open
      ? createPortal(
          <div
            ref={popupRef}
            style={{ position: "fixed", top: popupStyle.top, right: popupStyle.right, zIndex: 9999 }}
            className="w-48 bg-slate-900 border border-indigo-950/70 rounded-xl p-3 shadow-xl"
          >
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
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="text-xs text-indigo-300/40 hover:text-indigo-300/70 transition-colors whitespace-nowrap"
        aria-label="この投稿を通報する"
      >
        通報
      </button>
      {popup}
    </>
  );
}
