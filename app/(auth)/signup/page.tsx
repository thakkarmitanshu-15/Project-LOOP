"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          workspaceName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to create account.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        {/* =========================================
            BRAND PANEL
        ========================================= */}
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          {/* Decorative background elements */}
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border border-white/10" />

          <div className="absolute bottom-[-120px] right-[-100px] h-80 w-80 rounded-full border border-emerald-400/10" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Brand */}
            <div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-base font-bold text-slate-950 shadow-sm">
                  L
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight text-white">
                    LOOP
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Customer Intelligence
                  </p>
                </div>
              </Link>
            </div>

            {/* Main message */}
            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Build Your Workspace
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Bring your customer voice{" "}
                <span className="text-slate-400">
                  into focus.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400 xl:text-base">
                Create your LOOP workspace and bring customer
                feedback, sentiment, themes, and insights into
                one intelligent platform.
              </p>

              {/* Feature highlights */}
              <div className="mt-10 max-w-lg space-y-3">
                <FeatureRow
                  number="01"
                  title="Centralize feedback"
                  description="Bring feedback from multiple channels together."
                />

                <FeatureRow
                  number="02"
                  title="Understand sentiment"
                  description="Identify positive, neutral, and negative signals."
                />

                <FeatureRow
                  number="03"
                  title="Discover themes"
                  description="Turn recurring customer concerns into insights."
                />
              </div>
            </div>

            {/* Footer */}
            <div>
              <div className="mb-5 h-px w-full max-w-xl bg-white/10" />

              <p className="text-xs text-slate-500">
                AI-powered customer feedback intelligence
              </p>
            </div>
          </div>
        </section>

        {/* =========================================
            SIGNUP PANEL
        ========================================= */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center justify-center lg:hidden">
              <Link
                href="/signup"
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                  L
                </div>

                <div>
                  <p className="text-base font-bold tracking-tight text-slate-950">
                    LOOP
                  </p>

                  <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Customer Intelligence
                  </p>
                </div>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Workspace Setup
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Set up your LOOP workspace and start organizing
                customer feedback.
              </p>
            </div>

            {/* Signup card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-4.5"
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
                      </svg>
                    </span>

                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      required
                      autoComplete="name"
                      placeholder="Your name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="5"
                          width="18"
                          height="14"
                          rx="2"
                        />
                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    </span>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="10"
                          width="16"
                          height="11"
                          rx="2"
                        />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>

                    <input
                      id="password"
                      type={
                        showPassword ? "text" : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6-.4.8-1.3 2-2.6 3.1" />
                          <path d="M6.6 6.6C4.6 7.8 3.3 9.5 2.5 10.8 3.5 12.8 7 16 12 16c1 0 2-.2 2.9-.5" />
                        </svg>
                      ) : (
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Use at least 8 characters.
                  </p>
                </div>

                {/* Workspace */}
                <div>
                  <label
                    htmlFor="workspaceName"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Workspace name
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 21V5l8-2 8 2v16" />
                        <path d="M8 21v-5h8v5" />
                        <path d="M8 8h.01M12 8h.01M16 8h.01M8 11h.01M12 11h.01M16 11h.01" />
                      </svg>
                    </span>

                    <input
                      id="workspaceName"
                      type="text"
                      value={workspaceName}
                      onChange={(event) =>
                        setWorkspaceName(event.target.value)
                      }
                      required
                      placeholder="Your company or team"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                    />
                  </div>

                  <p className="mt-1.5 text-[10px] text-slate-400">
                    This will be your LOOP workspace.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                      !
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-red-800">
                        Account creation failed
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-red-600">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Create account
                      <span className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />

                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Already registered?
                </span>

                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* Login */}
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                Sign in instead
              </Link>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
              Create a workspace to begin analyzing your
              customer feedback with LOOP.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-500">
        {number}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-200">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}