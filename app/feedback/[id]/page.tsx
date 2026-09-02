"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type FeedbackTheme = {
  confidence: number;
  theme: {
    id: string;
    name: string;
    description: string | null;
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

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const response = await fetch(
          `/api/feedback/${params.id}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load feedback",
          );
        }

        setFeedback(data.feedback);
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

    if (params.id) {
      loadFeedback();
    }
  }, [params.id]);


    async function updateStatus(
    newStatus: "NEW" | "REVIEWED" | "ACTIONED",
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
          data.error || "Failed to update feedback",
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
          : "Unable to update feedback",
      );
    } finally {
      setUpdating(false);
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            Loading feedback...
          </div>
        </div>
      </main>
    );
  }

  if (error || !feedback) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← Back to Feedback Inbox
          </button>

          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error || "Feedback not found"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
           <button
            onClick={() => router.push("/feedback")}
            className="mb-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
            >
            ← Back to Feedback
            </button>
        

        <div className="rounded-lg border bg-white shadow-sm">
          {/* Header */}
          <div className="border-b px-6 py-5">
            <h1 className="text-xl font-bold text-gray-900">
              Feedback Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Submitted{" "}
              {new Date(
                feedback.createdAt,
              ).toLocaleString()}
            </p>
          </div>

          {/* Feedback content */}
          <div className="px-6 py-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Customer Feedback
            </h2>

            <p className="text-base leading-7 text-gray-900">
              {feedback.content}
            </p>
          </div>

          {/* Metadata */}
          <div className="grid gap-6 border-t px-6 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Channel
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {feedback.channel}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {feedback.customerLabel || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sentiment
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {feedback.sentiment || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sentiment Score
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {feedback.sentimentScore !== null
                  ? feedback.sentimentScore.toFixed(2)
                  : "—"}
              </p>
            </div>

            <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
            </p>

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
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ACTIONED">Actioned</option>
            </select>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source Reference
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {feedback.sourceRef || "—"}
              </p>
            </div>
          </div>

          {/* Themes */}
          <div className="border-t px-6 py-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              Themes
            </h2>

            {feedback.feedbackThemes.length === 0 ? (
              <p className="text-sm text-gray-500">
                No themes assigned.
              </p>
            ) : (
              <div className="space-y-3">
                {feedback.feedbackThemes.map(
                  (itemTheme) => (
                    <div
                      key={itemTheme.theme.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {itemTheme.theme.name}
                        </p>

                        <span className="text-sm text-gray-500">
                          Confidence:{" "}
                          {(
                            itemTheme.confidence * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>

                      {itemTheme.theme.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {itemTheme.theme.description}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}