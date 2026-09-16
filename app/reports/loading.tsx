export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-48 rounded-lg bg-slate-200" />
            <div className="mt-3 h-4 w-80 rounded bg-slate-200" />
          </div>

          <div className="h-10 w-40 rounded-xl bg-slate-200" />
        </div>

        {/* Period controls */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-32 rounded bg-slate-200" />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-10 rounded-xl bg-slate-200" />
            <div className="h-10 rounded-xl bg-slate-200" />
            <div className="h-10 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* Saved reports */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <div className="h-5 w-36 rounded bg-slate-200" />
          </div>

          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="p-5"
              >
                <div className="h-4 w-64 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-40 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Report preview */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-6 w-64 rounded bg-slate-200" />

          <div className="mt-6 space-y-3">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-11/12 rounded bg-slate-200" />
            <div className="h-4 w-4/5 rounded bg-slate-200" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="h-28 rounded-xl bg-slate-100" />
            <div className="h-28 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}