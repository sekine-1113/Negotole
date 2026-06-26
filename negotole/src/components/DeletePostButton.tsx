"use client";

import { useState } from "react";

type Props = {
  postId: number;
  onDeleted: (id: number) => void;
};

export function DeletePostButton({ postId, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("この投稿を削除しますか？")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/me/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "削除に失敗しました");
        return;
      }
      onDeleted(postId);
    } catch {
      setError("削除に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition"
      >
        {loading ? "削除中..." : "削除"}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
