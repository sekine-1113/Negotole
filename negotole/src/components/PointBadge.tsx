import { Star } from "lucide-react";

export function PointBadge({ total }: { total: number }) {
  return (
    <span className="bg-indigo-950/60 border border-indigo-500/30 rounded-full px-3.5 py-1.5 flex items-center gap-2 backdrop-blur-sm">
      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
      <span className="text-xs text-indigo-100 font-bold">
        <span className="text-amber-300 text-sm font-black">{total}</span> pt
      </span>
    </span>
  );
}
