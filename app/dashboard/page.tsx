import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Navbar from "@/app/components/Navbar";
import Analytics from "./Analytics";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        {/* Page Header */}
        <section className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Overview
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor customer feedback, sentiment, themes,
                and emerging trends across your workspace.
              </p>
            </div>

            <a
              href="/feedback"
              className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              View Feedback
              <span className="ml-2">→</span>
            </a>
          </div>
        </section>

        {/* Analytics */}
        <Analytics />
      </main>
    </div>
  );
}