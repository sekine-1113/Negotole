"use client";

import { Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const LS_KEY = "negotole_hide_points";

export function PointBadge({ total }: { total: number }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(LS_KEY) === "1");

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        setHidden(e.newValue === "1");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <Link href="/mypage" className="inline-block">
      <span className="bg-indigo-950/60 border border-indigo-500/30 rounded-full px-3.5 py-1.5 flex items-center gap-2 backdrop-blur-sm">
        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
        <span className="text-xs text-indigo-100 font-bold">
          {hidden ? (
            <span className="text-indigo-400/60 tracking-widest">···</span>
          ) : (
            <>
              <span className="text-amber-300 text-sm font-black">{total}</span>{" "}pt
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
