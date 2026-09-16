export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white">
          L
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Error 404
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          The page you are looking for does not exist or may have
          been moved.
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