export default function LocaleLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading music</span>
      <div className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/[0.055] motion-reduce:animate-none sm:h-52" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card p-3">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
            <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-white/5 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
