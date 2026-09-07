"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Theme = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  feedbackCount: number;
};

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  createdAt: string;
  feedbackThemes: {
    confidence: number;
    theme: {
      id: string;
      name: string;
    };
  }[];
};

type Report = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  generatedBy: string;
};

type ReportsResponse = {
  period: {
    start: string;
    end: string;
  };

  summary: {
    totalFeedback: number;
    positiveFeedback: number;
    neutralFeedback: number;
    negativeFeedback: number;

    sentimentRate: {
      positive: number;
      neutral: number;
      negative: number;
    };

    previousPeriod: {
      start: string;
      end: string;
      totalFeedback: number;
      sentimentRate: {
        positive: number;
        neutral: number;
        negative: number;
      };
    };

    sentimentShift: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };

  topThemes: Theme[];
  recentFeedback: FeedbackItem[];
  reports: Report[];
  error?: string;
};

const sentimentStyles = {
  POS: "bg-emerald-50 text-emerald-700",
  NEU: "bg-slate-100 text-slate-600",
  NEG: "bg-red-50 text-red-700",
};

export default function ReportsPage() {
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });

  const [periodEnd, setPeriodEnd] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        periodStart,
        periodEnd,
      });

      const response = await fetch(
        `/api/reports?${params.toString()}`,
      );

      const result: ReportsResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load report data",
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load report data",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  function handleApplyPeriod() {
    loadReport();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
              Voice of Customer
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Reports
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Understand what customers are saying, how sentiment is
              changing, and which themes deserve attention.
            </p>
          </div>

          {/* Period selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label
                  htmlFor="periodStart"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  From
                </label>

                <input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(event) =>
                    setPeriodStart(event.target.value)
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="periodEnd"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  To
                </label>

                <input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(event) =>
                    setPeriodEnd(event.target.value)
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyPeriod}
                disabled={loading}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !data ? (
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Period summary */}
            <div className="mt-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reporting period
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(data.period.start)} —{" "}
                  {formatDate(data.period.end)}
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total feedback"
                value={data.summary.totalFeedback}
                description="Customer responses received"
              />

              <SummaryCard
                label="Positive"
                value={`${data.summary.sentimentRate.positive}%`}
                description={`${data.summary.positiveFeedback} feedback items`}
              />

              <SummaryCard
                label="Neutral"
                value={`${data.summary.sentimentRate.neutral}%`}
                description={`${data.summary.neutralFeedback} feedback items`}
              />

              <SummaryCard
                label="Negative"
                value={`${data.summary.sentimentRate.negative}%`}
                description={`${data.summary.negativeFeedback} feedback items`}
              />
            </div>

            {/* Main report grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Top themes */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Customer priorities
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-950">
                      Top themes
                    </h2>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Top 10
                  </span>
                </div>

                {data.topThemes.length === 0 ? (
                  <EmptyState text="No themes found for this workspace." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {data.topThemes.map((theme, index) => (
                      <div key={theme.id}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-5 text-xs font-bold text-slate-400">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  theme.color || "#0f172a",
                              }}
                            />

                            <span className="truncate text-sm font-semibold text-slate-800">
                              {theme.name}
                            </span>
                          </div>

                          <span className="text-xs font-semibold text-slate-500">
                            {theme.feedbackCount}
                          </span>
                        </div>

                        <div className="ml-8 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all"
                            style={{
                              width: `${
                                data.topThemes[0]?.feedbackCount
                                  ? Math.max(
                                      5,
                                      (theme.feedbackCount /
                                        data.topThemes[0]
                                          .feedbackCount) *
                                        100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sentiment overview */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Customer mood
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Sentiment overview
                  </h2>
                </div>

                <div className="mt-7 space-y-6">
                  <SentimentRow
                    label="Positive"
                    percentage={
                      data.summary.sentimentRate.positive
                    }
                    count={data.summary.positiveFeedback}
                    className="bg-emerald-500"
                  />

                  <SentimentRow
                    label="Neutral"
                    percentage={
                      data.summary.sentimentRate.neutral
                    }
                    count={data.summary.neutralFeedback}
                    className="bg-slate-400"
                  />

                  <SentimentRow
                    label="Negative"
                    percentage={
                      data.summary.sentimentRate.negative
                    }
                    count={data.summary.negativeFeedback}
                    className="bg-red-500"
                  />
                </div>

                <div className="mt-7 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Report insight
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.summary.totalFeedback === 0
                      ? "There is not enough feedback data for this period."
                      : data.summary.negativeFeedback >
                          data.summary.positiveFeedback
                        ? "Negative feedback currently outweighs positive feedback during this reporting period."
                        : data.summary.positiveFeedback >
                            data.summary.negativeFeedback
                          ? "Positive feedback currently outweighs negative feedback during this reporting period."
                          : "Positive and negative feedback are currently balanced during this reporting period."}
                  </p>
                </div>
              </section>
            </div>

            {/* Sentiment shifts */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Period comparison
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Sentiment shifts
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Change in sentiment compared with the previous
                    equivalent period.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-400">
                    Previous period
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {formatDate(
                      data.summary.previousPeriod.start,
                    )}{" "}
                    —{" "}
                    {formatDate(
                      data.summary.previousPeriod.end,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <ShiftCard
                  label="Positive"
                  value={data.summary.sentimentShift.positive}
                  current={data.summary.sentimentRate.positive}
                  previous={
                    data.summary.previousPeriod.sentimentRate
                      .positive
                  }
                />

                <ShiftCard
                  label="Neutral"
                  value={data.summary.sentimentShift.neutral}
                  current={data.summary.sentimentRate.neutral}
                  previous={
                    data.summary.previousPeriod.sentimentRate
                      .neutral
                  }
                />

                <ShiftCard
                  label="Negative"
                  value={data.summary.sentimentShift.negative}
                  current={data.summary.sentimentRate.negative}
                  previous={
                    data.summary.previousPeriod.sentimentRate
                      .negative
                  }
                />
              </div>
            </section>

            {/* Representative feedback */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Customer voice
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Representative feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Recent feedback from the selected reporting
                    period.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {data.recentFeedback.length} items
                </span>
              </div>

              {data.recentFeedback.length === 0 ? (
                <EmptyState text="No feedback was found for this period." />
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {data.recentFeedback.slice(0, 8).map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {item.channel}
                        </span>

                        {item.sentiment && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sentimentStyles[item.sentiment]}`}
                          >
                            {item.sentiment}
                          </span>
                        )}

                        <span className="ml-auto text-xs text-slate-400">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        &ldquo;{item.content}&rdquo;
                      </p>

                      {item.feedbackThemes.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.feedbackThemes
                            .slice(0, 3)
                            .map((feedbackTheme) => (
                              <span
                                key={feedbackTheme.theme.id}
                                className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-500"
                              >
                                {feedbackTheme.theme.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Saved reports */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Report history
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  Saved reports
                </h2>
              </div>

              {data.reports.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No saved reports yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    AI-generated reports will appear here once
                    report generation is enabled.
                  </p>
                </div>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {data.reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {report.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(report.periodStart)} —{" "}
                          {formatDate(report.periodEnd)}
                        </p>
                      </div>

                      <span className="text-xs text-slate-400">
                        Created {formatDate(report.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SentimentRow({
  label,
  percentage,
  count,
  className,
}: {
  label: string;
  percentage: number;
  count: number;
  className: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-xs text-slate-500">
          {percentage}% · {count}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${className}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ShiftCard({
  label,
  value,
  current,
  previous,
}: {
  label: string;
  value: number;
  current: number;
  previous: number;
}) {
  const isPositiveChange = value > 0;
  const isNegativeChange = value < 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>

        <span
          className={`text-xs font-bold ${
            isPositiveChange
              ? "text-emerald-600"
              : isNegativeChange
                ? "text-red-600"
                : "text-slate-500"
          }`}
        >
          {value > 0 ? "+" : ""}
          {value} pp
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-950">
          {current}%
        </span>

        <span className="mb-1 text-xs text-slate-400">
          vs {previous}%
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Percentage-point change from the previous period.
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}