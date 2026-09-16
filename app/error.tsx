"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("LOOP application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-slate-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white">
          L
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Something went wrong
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          We couldn't load this page
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          An unexpected error occurred. You can try loading the
          page again or return to the dashboard.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try again
          </button>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}