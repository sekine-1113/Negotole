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

export function CountdownTimer({ hiddenAt, createdAt }: { hiddenAt: string; createdAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = new Date(hiddenAt).getTime() - new Date(createdAt).getTime();
    const calc = () => {
      const now = Date.now();
      const rem = new Date(hiddenAt).getTime() - now;
      const elapsed = now - new Date(createdAt).getTime();
      return { rem, prog: total > 0 ? (elapsed / total) * 100 : 100 };
    };

    const initial = setTimeout(() => {
      const { rem, prog } = calc();
      setRemaining(rem);
      setProgress(prog);
    }, 0);
    const timer = setInterval(() => {
      const { rem, prog } = calc();
      setRemaining(rem);
      setProgress(prog);
    }, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [hiddenAt, createdAt]);

  if (remaining === null) return null;

  return (
    <div className="w-full">
      <span className={remaining < 3600 * 1000 ? "text-pink-400 font-bold text-xs" : "text-indigo-300 text-xs"}>
        {formatRemaining(remaining)}
      </span>
      <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1 rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(0, 100 - Math.min(progress, 100))}%` }}
        />
      </div>
    </div>
  );
}
