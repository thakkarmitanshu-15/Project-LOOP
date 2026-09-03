"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

type FeedbackTheme = {
  confidence: number;
  theme: {
    id: string;
    name: string;
    color: string | null;
  };
};

type Feedback = {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  feedbackThemes: FeedbackTheme[];
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [feedback, setFeedback] = useState<Feedback | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const feedbackId = params.id as string;

  useEffect(() => {
    async function loadFeedback() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/feedback/${feedbackId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Feedback not found");
          }

          throw new Error("Failed to load feedback");
        }

        const data = await response.json();

        setFeedback(data.feedback);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load feedback"
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
    newStatus: "NEW" | "REVIEWED" | "ACTIONED"
  ) {
    if (!feedback) return;

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
          data.error || "Failed to update status"
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
          : "Unable to update status"
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/feedback")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <span>←</span>
          Back to Feedback
        </button>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading feedback...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              !
            </div>

            <h1 className="mt-4 text-lg font-semibold text-red-900">
              Unable to load feedback
            </h1>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => router.push("/feedback")}
              className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Return to Feedback
            </button>
          </div>
        )}

        {/* Feedback Detail */}
        {!loading && !error && feedback && (
          <>
            {/* Header */}
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Feedback Record
                </span>
              </div>

              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Feedback Detail
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    Review the customer feedback record and its
                    classification.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadge(
                      feedback.status
                    )}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {getStatusLabel(feedback.status)}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${getSentimentBadge(
                      feedback.sentiment
                    )}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {getSentimentLabel(feedback.sentiment)}
                  </span>
                </div>
              </div>
            </section>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Main feedback */}
              <section className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Customer Feedback
                      </p>

                      <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        Feedback Content
                      </h2>
                    </div>

                    <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      {feedback.channel}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-6">
                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                      {feedback.content}
                    </p>
                  </div>
                </div>

                {/* Themes */}
                <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Classification
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      Related Themes
                    </h2>
                  </div>

                  {feedback.feedbackThemes.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {feedback.feedbackThemes.map(
                        (item) => (
                          <div
                            key={item.theme.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      item.theme.color ||
                                      "#64748b",
                                  }}
                                />

                                <span className="text-sm font-semibold text-slate-900">
                                  {item.theme.name}
                                </span>
                              </div>

                              <span className="text-xs font-semibold text-slate-400">
                                {Math.round(
                                  item.confidence * 100
                                )}
                                %
                              </span>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-800"
                                style={{
                                  width: `${Math.min(
                                    Math.max(
                                      item.confidence * 100,
                                      0
                                    ),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-[11px] text-slate-400">
                              Classification confidence
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-6 text-center">
                      <p className="text-sm font-medium text-slate-500">
                        No themes assigned yet.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Status */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Workflow
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Status
                  </h2>

                  <select
                    value={feedback.status}
                    disabled={updating}
                    onChange={(event) =>
                      updateStatus(
                        event.target.value as
                          | "NEW"
                          | "REVIEWED"
                          | "ACTIONED"
                      )
                    }
                    className={`mt-4 w-full rounded-xl border px-3.5 py-3 text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${getStatusBadge(
                      feedback.status
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
                    Update the workflow status as this feedback
                    moves through review.
                  </p>
                </div>

                {/* Details */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Record Information
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Details
                  </h2>

                  <div className="mt-5 space-y-4">
                    <DetailRow
                      label="Channel"
                      value={feedback.channel}
                    />

                    <DetailRow
                      label="Customer"
                      value={
                        feedback.customerLabel || "Not provided"
                      }
                    />

                    <DetailRow
                      label="Source"
                      value={
                        feedback.sourceRef || "Not provided"
                      }
                    />

                    <DetailRow
                      label="Created"
                      value={new Date(
                        feedback.createdAt
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

                {/* Sentiment */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Sentiment Analysis
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Sentiment
                  </h2>

                  <div className="mt-5 flex items-end justify-between">
                    <span
                      className={`text-2xl font-bold ${getSentimentTextColor(
                        feedback.sentiment
                      )}`}
                    >
                      {getSentimentLabel(feedback.sentiment)}
                    </span>

                    {feedback.sentimentScore !== null && (
                      <span className="text-sm font-semibold text-slate-500">
                        {feedback.sentimentScore > 0
                          ? "+"
                          : ""}
                        {feedback.sentimentScore.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {feedback.sentimentScore !== null && (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                ((feedback.sentimentScore + 1) /
                                  2) *
                                  100,
                                0
                              ),
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400">
                        <span>Negative</span>
                        <span>Neutral</span>
                        <span>Positive</span>
                      </div>
                    </div>
                  )}
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}

function getSentimentBadge(
  sentiment: Feedback["sentiment"]
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
  sentiment: Feedback["sentiment"]
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
  sentiment: Feedback["sentiment"]
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
  status: Feedback["status"]
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
  status: Feedback["status"]
) {
  if (status === "NEW") {
    return "New";
  }

  if (status === "REVIEWED") {
    return "Reviewed";
  }

  return "Actioned";
}