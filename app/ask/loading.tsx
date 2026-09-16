export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        {/* Header */}
        <div className="h-8 w-40 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />

        {/* Question box */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-36 rounded bg-slate-200" />

          <div className="mt-4 h-24 rounded-xl bg-slate-100" />

          <div className="mt-4 flex justify-end">
            <div className="h-10 w-32 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* Answer */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-28 rounded bg-slate-200" />

          <div className="mt-5 space-y-3">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-11/12 rounded bg-slate-200" />
            <div className="h-4 w-4/5 rounded bg-slate-200" />
          </div>
        </div>

        {/* Evidence */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-40 rounded bg-slate-200" />

          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/3 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}