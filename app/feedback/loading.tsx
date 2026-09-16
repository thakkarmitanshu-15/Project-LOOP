export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-slate-200" />

          <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-10 w-full rounded-xl bg-slate-200" />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-10 rounded-xl bg-slate-200" />
              <div className="h-10 rounded-xl bg-slate-200" />
              <div className="h-10 rounded-xl bg-slate-200" />
              <div className="h-10 rounded-xl bg-slate-200" />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <div className="h-5 w-40 rounded bg-slate-200" />
            </div>

            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="p-5"
                >
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-1/3 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}