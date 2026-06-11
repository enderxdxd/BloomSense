export function FloralProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Generating floral profile"
      className="mt-12 animate-pulse overflow-hidden rounded-3xl border border-bloom-gold/30 bg-white shadow-[0_20px_60px_-30px_rgba(109,46,70,0.25)]"
    >
      <div className="aspect-[16/9] w-full bg-gradient-to-br from-bloom-cream via-bloom-cream to-bloom-gold/20" />

      <div className="px-6 pb-12 pt-10 sm:px-12 sm:pb-16 sm:pt-14">
        <div className="border-b border-bloom-cream pb-8">
          <div className="h-3 w-40 rounded bg-bloom-sage/30" />
          <div className="mt-5 h-12 w-3/4 rounded bg-bloom-primary/15 sm:h-14" />
          <div className="mt-4 h-5 w-2/3 rounded bg-bloom-rose/20" />
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.7fr,1fr]">
          <div className="space-y-3">
            <div className="h-5 w-full rounded bg-bloom-primary/15" />
            <div className="h-5 w-11/12 rounded bg-bloom-primary/15" />
            <div className="h-5 w-3/4 rounded bg-bloom-primary/15" />
            <div className="mt-6 h-4 w-full rounded bg-bloom-primary/10" />
            <div className="h-4 w-11/12 rounded bg-bloom-primary/10" />
            <div className="h-4 w-10/12 rounded bg-bloom-primary/10" />
            <div className="h-4 w-9/12 rounded bg-bloom-primary/10" />
          </div>
          <div className="space-y-6 lg:border-l lg:border-bloom-cream lg:pl-10">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-16 rounded bg-bloom-sage/30" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full rounded bg-bloom-rose/15" />
                  <div className="h-4 w-5/6 rounded bg-bloom-rose/15" />
                  <div className="h-4 w-2/3 rounded bg-bloom-rose/15" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-bloom-cream pt-10">
          <div className="h-3 w-32 rounded bg-bloom-sage/30" />
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 rounded bg-bloom-gold/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full rounded bg-bloom-primary/10" />
                  <div className="h-4 w-4/5 rounded bg-bloom-primary/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
