type Props = {
  hourCounts: number[];
};

export function PostHeatmap({ hourCounts }: Props) {
  const max = Math.max(...hourCounts, 1);
  return (
    <div className="bg-slate-900/40 border border-indigo-950/50 rounded-xl p-4">
      <p className="text-xs text-indigo-300/50 font-bold tracking-wide mb-3">投稿時間帯</p>
      <div className="flex items-end gap-px h-16">
        {hourCounts.map((count, hour) => (
          <div key={hour} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-indigo-500/40 rounded-sm"
              style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? "2px" : "0" }}
            />
            {(hour === 0 || hour === 6 || hour === 12 || hour === 18) && (
              <span className="text-[8px] text-indigo-300/30 mt-1">{hour}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
