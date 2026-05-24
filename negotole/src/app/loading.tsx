export default function Loading() {
  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
