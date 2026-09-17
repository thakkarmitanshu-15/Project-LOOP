"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Theme = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: {
    feedbackThemes: number;
  };
};

/*
 * Fallback palette for themes that do not have a color stored yet.
 * The API/database color is still preferred when it exists.
 */
const themeColorPalette = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#65a30d",
  "#9333ea",
];

function getThemeColor(theme: Theme, index: number) {
  return (
    theme.color ||
    themeColorPalette[index % themeColorPalette.length]
  );
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadThemes() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/themes");

        if (!response.ok) {
          throw new Error("Failed to load themes");
        }

        const data = await response.json();

        setThemes(data.themes ?? []);
      } catch (error) {
        console.error(error);
        setError("Unable to load themes");
      } finally {
        setLoading(false);
      }
    }

    loadThemes();
  }, []);

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
                  Feedback Intelligence
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Themes
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Explore the main topics and patterns identified
                across your customer feedback.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Total Themes
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {themes.length}
              </p>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Loading themes...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Fetching themes from your workspace.
            </p>
          </div>
        )}

        {/* Themes */}
        {!loading && !error && (
          <>
            {themes.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  #
                </div>

                <h2 className="mt-4 text-sm font-semibold text-slate-900">
                  No themes found
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Themes will appear here once feedback has been
                  classified.
                </p>
              </div>
            ) : (
              <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {themes.map((theme, index) => {
                  const themeColor = getThemeColor(theme, index);

                  return (
                    <a
                      key={theme.id}
                      href={`/feedback?themeId=${theme.id}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full ring-4 ring-slate-50"
                            style={{
                              backgroundColor: themeColor,
                            }}
                            title={themeColor}
                            aria-hidden="true"
                          />

                          <h2 className="truncate text-base font-semibold text-slate-950">
                            {theme.name}
                          </h2>
                        </div>

                        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500">
                          →
                        </span>
                      </div>

                      <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-500">
                        {theme.description ||
                          "Customer feedback related to this theme."}
                      </p>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Feedback
                        </span>

                        <span className="text-sm font-bold text-slate-900">
                          {theme._count.feedbackThemes}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
