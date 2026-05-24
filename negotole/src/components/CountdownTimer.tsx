"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "期限切れ";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `あと ${hours}時間 ${minutes}分`;
  if (minutes > 0) return `あと ${minutes}分 ${seconds}秒`;
  return `あと ${seconds}秒`;
}

export function CountdownTimer({ hiddenAt }: { hiddenAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(hiddenAt).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(hiddenAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hiddenAt]);

  return (
    <span className={remaining < 3600 * 1000 ? "text-red-500 font-bold" : "text-gray-400 text-sm"}>
      {formatRemaining(remaining)}
    </span>
  );
}
