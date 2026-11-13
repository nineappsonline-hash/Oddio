export default function LocaleLoading() {
  return (
    <div className="space-y-6" aria-busy="true" role="status" aria-label="Loading content">
      <span className="sr-only">Loading music</span>
      <div className="h-52 animate-pulse rounded-card bg-surface/70" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card p-3">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-white/5" />
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
