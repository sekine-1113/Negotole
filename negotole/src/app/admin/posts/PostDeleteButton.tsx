"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PostDeleteButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("この投稿を削除しますか？")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "削除に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-red-400 hover:text-red-200 text-xs transition disabled:opacity-50"
      >
        {pending ? "削除中..." : "削除"}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
