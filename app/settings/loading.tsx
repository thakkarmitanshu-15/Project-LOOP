export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        {/* Header */}
        <div className="h-8 w-40 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

        {/* Workspace settings */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-48 rounded bg-slate-200" />

          <div className="mt-6 space-y-5">
            <div>
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-2 h-10 w-full rounded-xl bg-slate-200" />
            </div>

            <div>
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-2 h-10 w-full rounded-xl bg-slate-200" />
            </div>

            <div className="flex justify-end">
              <div className="h-10 w-32 rounded-xl bg-slate-200" />
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <div className="h-5 w-40 rounded bg-slate-200" />
          </div>

          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />

                  <div>
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-44 rounded bg-slate-200" />
                  </div>
                </div>

                <div className="h-8 w-20 rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}