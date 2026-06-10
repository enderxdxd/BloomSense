export function FloralProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Generating floral profile"
      className="mt-10 animate-pulse overflow-hidden rounded-2xl border border-bloom-sage/30 bg-white shadow-sm"
    >
      <div className="border-b border-bloom-cream bg-gradient-to-br from-bloom-cream to-white p-6 sm:p-8">
        <div className="h-3 w-24 rounded-full bg-bloom-sage/30" />
        <div className="mt-3 h-8 w-3/4 rounded bg-bloom-primary/15" />
        <div className="mt-4 h-4 w-full rounded bg-bloom-rose/15" />
        <div className="mt-2 h-4 w-5/6 rounded bg-bloom-rose/15" />
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 rounded bg-bloom-sage/30" />
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="h-6 w-16 rounded-full bg-bloom-cream" />
              <div className="h-6 w-20 rounded-full bg-bloom-cream" />
              <div className="h-6 w-14 rounded-full bg-bloom-cream" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
