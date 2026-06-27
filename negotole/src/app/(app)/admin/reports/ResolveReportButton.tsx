"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveReportButton({ reportId }: { reportId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId }),
      });
      if (!res.ok) {
        setError("解決に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("解決に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleResolve}
        disabled={loading}
        className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
      >
        {loading ? "処理中..." : "解決済みにする"}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
