export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        {/* Header */}
        <div className="h-8 w-40 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

        {/* Theme cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="h-5 w-32 rounded bg-slate-200" />
              </div>

              <div className="mt-5 space-y-2">
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="h-3 w-4/5 rounded bg-slate-200" />
              </div>

              <div className="mt-6 h-3 w-24 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}