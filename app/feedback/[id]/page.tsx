"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/app/components/Navbar";

type FeedbackTheme = {
  confidence: number;
  theme: {
    id: string;
    name: string;
    color: string | null;
  };
};

type ClassificationResult = {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  themes: string[];
  featureArea: string;
  rationale: string;
};

type Feedback = {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  featureArea: string | null;
  aiRationale: string | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  needsManualReview: boolean;
  feedbackThemes: FeedbackTheme[];
};

type ClassificationResponse = {
  message?: string;
  classification?: ClassificationResult;
  themes?: Array<{
    id: string;
    name: string;
  }>;
  needsManualReview?: boolean;
  error?: string;
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const role = session?.user?.role;

  const canManageFeedback =
    role === "ADMIN" || role === "ANALYST";

  const roleLabel =
    role === "ADMIN"
      ? "Administrator"
      : role === "ANALYST"
        ? "Analyst"
        : "Viewer";

  const [feedback, setFeedback] = useState<Feedback | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] =
    useState("");

  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);

  const feedbackId = params.id as string;

  const hasClassification =
    classification !== null ||
    (
      feedback?.featureArea !== null &&
      feedback?.aiRationale !== null &&
      feedback?.sentiment !== null &&
      feedback?.sentimentScore !== null
    );

  useEffect(() => {
    async function loadFeedback() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/feedback/${feedbackId}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Feedback not found");
          }

          throw new Error("Failed to load feedback");
        }

        const data = await response.json();

        setFeedback(data.feedback);

        if (
        data.feedback.featureArea &&
        data.feedback.aiRationale &&
        data.feedback.sentiment &&
        data.feedback.sentimentScore !== null
      ) {
        setClassification({
          sentiment: data.feedback.sentiment,
          sentimentScore: data.feedback.sentimentScore,
          themes: data.feedback.feedbackThemes.map(
            (item: FeedbackTheme) => item.theme.name,
          ),
          featureArea: data.feedback.featureArea,
          rationale: data.feedback.aiRationale,
        });
      }
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load feedback",
        );
      } finally {
        setLoading(false);
      }
    }

    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId]);

  async function updateStatus(
    newStatus: "NEW" | "REVIEWED" | "ACTIONED",
  ) {
    if (!feedback || !canManageFeedback) return;

    try {
      setUpdating(true);
      setError("");

      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feedback.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update status",
        );
      }

      setFeedback({
        ...feedback,
        status: newStatus,
      });
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update status",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function classifyWithAI() {
    if (!feedback || !canManageFeedback || classifying) {
      return;
    }

    try {
      setClassifying(true);
      setClassificationError("");

      const response = await fetch(
        `/api/feedback/${feedback.id}/classify`,
        {
          method: "POST",
        },
      );

      const data: ClassificationResponse =
        await response.json();

      if (!response.ok) {
        if (data.needsManualReview) {
          setClassificationError(
            "AI classification failed after two attempts. This feedback has been flagged for manual review.",
          );
        } else {
          setClassificationError(
            data.error || "Failed to classify feedback",
          );
        }

        setFeedback({
          ...feedback,
          needsManualReview:
            data.needsManualReview ?? true,
        });

        return;
      }

      if (!data.classification) {
        throw new Error(
          "Classification response was incomplete",
        );
      }

      setClassification(data.classification);

      setFeedback({
        ...feedback,
        sentiment: data.classification.sentiment,
        sentimentScore:
          data.classification.sentimentScore,
        featureArea: data.classification.featureArea,
        aiRationale: data.classification.rationale,
        needsManualReview: false,
        feedbackThemes:
          data.themes?.map((theme) => ({
            confidence: 1,
            theme: {
              id: theme.id,
              name: theme.name,
              color: null,
            },
          })) ?? [],
      });
    } catch (error) {
      console.error(error);

      setClassificationError(
        error instanceof Error
          ? error.message
          : "Unable to classify feedback",
      );
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <main className="mx-auto max-w-[1280px] px-5 py-7 sm:px-6 lg:px-10 lg:py-9">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/feedback")}
          className="group mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Back to Feedback
        </button>

        {/* Loading */}
        {loading && (
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-10 w-72 rounded-lg bg-slate-200" />
              <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-lg font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-lg font-bold text-red-950">
              Unable to load feedback
            </h1>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => router.push("/feedback")}
              className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Return to Feedback
            </button>
          </div>
        )}

        {/* Detail */}
        {!loading && !error && feedback && (
          <>
            {/* Header */}
            <section className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Feedback Record
                </span>
              </div>

              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                      Feedback Detail
                    </h1>

                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        role === "ADMIN"
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : role === "ANALYST"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Review the customer feedback, classification,
                    sentiment, themes, and workflow state.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!canManageFeedback && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Read only
                    </span>
                  )}

                  {feedback.needsManualReview && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Manual review
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${getStatusBadge(
                      feedback.status,
                    )}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {getStatusLabel(feedback.status)}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${getSentimentBadge(
                      feedback.sentiment,
                    )}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {getSentimentLabel(feedback.sentiment)}
                  </span>
                </div>
              </div>
            </section>

            {/* Main */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* Left */}
              <section className="space-y-6">
                {/* Feedback content */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Customer Feedback
                      </p>

                      <h2 className="mt-1 text-lg font-bold">
                        Feedback Content
                      </h2>
                    </div>

                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                      {feedback.channel}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
                      <div className="absolute left-0 top-0 h-full w-1 bg-slate-900" />

                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                        {feedback.content}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Classification */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        AI Intelligence
                      </p>

                      <h2 className="mt-1 text-lg font-bold">
                        AI Classification
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Analyze this feedback using the workspace&apos;s
                        existing themes.
                      </p>
                    </div>

                    {canManageFeedback && (
                      <button
                        type="button"
                        onClick={classifyWithAI}
                        disabled={classifying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {classifying ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Classifying...
                          </>
                        ) : (
                          <>
                            <span className="text-sm">
                              {feedback.needsManualReview
                                ? "↻"
                                : hasClassification
                                  ? "↻"
                                  : "✦"}
                            </span>
                            {feedback.needsManualReview
                              ? "Retry AI Classification"
                              : hasClassification
                                ? "Re-classify with AI"
                                : "Classify with AI"}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    {classificationError && (
                      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs font-semibold leading-5 text-red-700">
                          {classificationError}
                        </p>
                      </div>
                    )}

                    {classification ? (
                      <div className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                              Sentiment
                            </p>

                            <p
                              className={`mt-2 text-lg font-bold ${getSentimentTextColor(
                                classification.sentiment,
                              )}`}
                            >
                              {getSentimentLabel(
                                classification.sentiment,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                              Sentiment Score
                            </p>

                            <p className="mt-2 text-lg font-bold text-slate-900">
                              {classification.sentimentScore > 0
                                ? "+"
                                : ""}
                              {classification.sentimentScore.toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            Feature Area
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {classification.featureArea}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            AI Rationale
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {classification.rationale}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            Assigned Themes
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {classification.themes.map(
                              (theme) => (
                                <span
                                  key={theme}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                >
                                  {theme}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                          ✦
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No AI classification available
                        </p>

                        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                          {canManageFeedback
                            ? "Run AI classification to analyze sentiment, themes, feature area, and rationale."
                            : "An Administrator or Analyst can run AI classification for this feedback."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Themes */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Classification
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      Related Themes
                    </h2>
                  </div>

                  <div className="p-6">
                    {feedback.feedbackThemes.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {feedback.feedbackThemes.map(
                          (item) => (
                            <div
                              key={item.theme.id}
                              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor:
                                        item.theme.color ||
                                        "#64748b",
                                    }}
                                  />

                                  <span className="truncate text-sm font-semibold text-slate-900">
                                    {item.theme.name}
                                  </span>
                                </div>

                                <span className="text-xs font-bold text-slate-400">
                                  {Math.round(
                                    item.confidence * 100,
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-slate-800 transition-all"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        item.confidence *
                                          100,
                                        0,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>

                              <p className="mt-2 text-[10px] font-medium text-slate-400">
                                Classification confidence
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                          —
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-600">
                          No themes assigned
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          This feedback has not been assigned to
                          a theme yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Right */}
              <aside className="space-y-6">
                {/* Workflow */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Workflow
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      Status
                    </h2>
                  </div>

                  <div className="p-6">
                    {canManageFeedback ? (
                      <>
                        <select
                          value={feedback.status}
                          disabled={updating}
                          onChange={(event) =>
                            updateStatus(
                              event.target.value as
                                | "NEW"
                                | "REVIEWED"
                                | "ACTIONED",
                            )
                          }
                          className={`w-full rounded-xl border px-3.5 py-3 text-sm font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${getStatusBadge(
                            feedback.status,
                          )}`}
                        >
                          <option value="NEW">New</option>
                          <option value="REVIEWED">
                            Reviewed
                          </option>
                          <option value="ACTIONED">
                            Actioned
                          </option>
                        </select>

                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          Update the workflow status as this
                          feedback moves through review.
                        </p>
                      </>
                    ) : (
                      <>
                        <div
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${getStatusBadge(
                            feedback.status,
                          )}`}
                        >
                          <span className="text-sm font-bold">
                            {getStatusLabel(feedback.status)}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                            Read only
                          </span>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          Your Viewer role allows you to review
                          this record but not change its workflow
                          status.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Record information */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Record Information
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      Details
                    </h2>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      <DetailRow
                        label="Channel"
                        value={feedback.channel}
                      />

                      <DetailRow
                        label="Customer"
                        value={
                          feedback.customerLabel ||
                          "Not provided"
                        }
                      />

                      <DetailRow
                        label="Source"
                        value={
                          feedback.sourceRef ||
                          "Not provided"
                        }
                      />

                      <DetailRow
                        label="Created"
                        value={new Date(
                          feedback.createdAt,
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      />

                      <DetailRow
                        label="Feedback ID"
                        value={feedback.id}
                      />
                    </div>
                  </div>
                </div>

                {/* Sentiment */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Sentiment Analysis
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      Sentiment
                    </h2>
                  </div>

                  <div className="p-6">
                    <div className="flex items-end justify-between">
                      <span
                        className={`text-2xl font-bold ${getSentimentTextColor(
                          feedback.sentiment,
                        )}`}
                      >
                        {getSentimentLabel(feedback.sentiment)}
                      </span>

                      {feedback.sentimentScore !== null && (
                        <span className="text-sm font-bold text-slate-500">
                          {feedback.sentimentScore > 0
                            ? "+"
                            : ""}
                          {feedback.sentimentScore.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {feedback.sentimentScore !== null && (
                      <div className="mt-5">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800 transition-all"
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  ((feedback.sentimentScore +
                                    1) /
                                    2) *
                                    100,
                                  0,
                                ),
                                100,
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          <span>Negative</span>
                          <span>Neutral</span>
                          <span>Positive</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function getSentimentBadge(
  sentiment: Feedback["sentiment"],
) {
  if (sentiment === "POS") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (sentiment === "NEG") {
    return "bg-red-50 text-red-700";
  }

  if (sentiment === "NEU") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-400";
}

function getSentimentTextColor(
  sentiment: Feedback["sentiment"],
) {
  if (sentiment === "POS") {
    return "text-emerald-600";
  }

  if (sentiment === "NEG") {
    return "text-red-600";
  }

  if (sentiment === "NEU") {
    return "text-slate-600";
  }

  return "text-slate-400";
}

function getSentimentLabel(
  sentiment: Feedback["sentiment"],
) {
  if (sentiment === "POS") {
    return "Positive";
  }

  if (sentiment === "NEG") {
    return "Negative";
  }

  if (sentiment === "NEU") {
    return "Neutral";
  }

  return "Unclassified";
}

function getStatusBadge(
  status: Feedback["status"],
) {
  if (status === "NEW") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "REVIEWED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getStatusLabel(
  status: Feedback["status"],
) {
  if (status === "NEW") {
    return "New";
  }

  if (status === "REVIEWED") {
    return "Reviewed";
  }

  return "Actioned";
}