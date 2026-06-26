"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveReportButton({ reportId }: { reportId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    try {
      await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId }),
      });
      router.refresh();
    } catch {
      // サイレント失敗
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
    >
      {loading ? "処理中..." : "解決済みにする"}
    </button>
  );
}
