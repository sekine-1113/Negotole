"use client";

import { useState } from "react";

interface Props {
  userId: number;
  isFrozen: boolean;
}

export function FreezeButton({ userId, isFrozen }: Props) {
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(isFrozen);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    const action = frozen ? "unfreeze" : "freeze";
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `${action} failed`);
      }
      setFrozen(!frozen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`px-3 py-1 rounded text-sm font-medium transition disabled:opacity-50 ${
          frozen
            ? "bg-emerald-700 hover:bg-emerald-600 text-white"
            : "bg-red-800 hover:bg-red-700 text-white"
        }`}
      >
        {loading ? "処理中..." : frozen ? "凍結解除" : "凍結"}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
