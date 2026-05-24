export function PointBadge({ total }: { total: number }) {
  return (
    <span className="text-sm text-gray-600 bg-gray-100 rounded-full px-3 py-1">
      残 {total}pt
    </span>
  );
}
