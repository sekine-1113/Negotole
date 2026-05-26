export function PointBadge({ total }: { total: number }) {
  return (
    <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5 sm:text-sm sm:px-3 sm:py-1">
      残 {total}pt
    </span>
  );
}
