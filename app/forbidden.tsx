export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white">
          L
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Error 403
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Access denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          You do not have permission to access this resource.
          Contact a workspace administrator if you believe this
          is incorrect.
        </p>

        <a
          href="/dashboard"
          className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to Dashboard
        </a>
      </div>
    </main>
  );
}