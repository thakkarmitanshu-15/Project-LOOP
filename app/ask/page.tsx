"use client";

import { FormEvent, useState } from "react";
import Navbar from "@/app/components/Navbar";

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
};

type AskResponse = {
  question: string;
  answer?: string;
  feedback: FeedbackItem[];
  feedbackIds?: string[];
  error?: string;
};

const sentimentStyles = {
  POS: "bg-emerald-50 text-emerald-700",
  NEU: "bg-slate-100 text-slate-600",
  NEG: "bg-red-50 text-red-700",
};

const statusStyles = {
  NEW: "bg-amber-50 text-amber-700",
  REVIEWED: "bg-blue-50 text-blue-700",
  ACTIONED: "bg-emerald-50 text-emerald-700",
};

export default function AskLoopPage() {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<FeedbackItem[]>([]);
  const [searchedQuestion, setSearchedQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setAnswer("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data: AskResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search feedback.");
      }

      setSearchedQuestion(data.question);
      setAnswer(data.answer ?? "");
      setResults(data.feedback);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while searching.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            AI Customer Intelligence
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Ask LOOP
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Ask questions about your customer feedback and explore the
            evidence behind the answer.
          </p>
        </div>

        {/* Search box */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form id="ask-loop-form" onSubmit={handleSubmit}>
            <label
              htmlFor="question"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              What would you like to know?
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="question"
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="e.g. What are customers saying about billing?"
                className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Searching..." : "Ask LOOP"}
              </button>
            </div>

            {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {error}
                </p>

                <p className="mt-1 text-xs text-red-600">
                  Your question was not completed. You can try again.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById("ask-loop-form");

                  if (form instanceof HTMLFormElement) {
                    form.requestSubmit();
                  }
                }}
                disabled={loading}
                className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Retrying..." : "Try again"}
              </button>
            </div>
          </div>
        )}
          </form>
        </section>

        {/* Results */}
       {searchedQuestion && !loading && (
  <section className="mt-8">
    {/* AI Answer */}
    {answer && (
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            L
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              LOOP analysis
            </p>

            <p className="text-sm font-semibold text-slate-900">
              AI-generated answer
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-sm leading-7 text-slate-700">
            {answer}
          </p>
        </div>
      </div>
    )}

    {/* Retrieved Evidence */}
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Retrieved evidence
        </p>

        <h2 className="mt-1 text-lg font-bold text-slate-950">
          Results for &ldquo;{searchedQuestion}&rdquo;
        </h2>
      </div>

      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {results.length}{" "}
        {results.length === 1 ? "item" : "items"}
      </span>
    </div>

    {results.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg">
          ?
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          No matching feedback found
        </h3>

        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
          Try using a broader question or a specific customer
          feedback keyword.
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {results.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {item.channel}
              </span>

              {item.sentiment && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sentimentStyles[item.sentiment]}`}
                >
                  {item.sentiment}
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[item.status]}`}
              >
                {item.status}
              </span>

              <span className="ml-auto text-xs text-slate-400">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              {item.content}
            </p>

            {item.sentimentScore !== null && (
              <div className="mt-4 text-xs text-slate-400">
                Sentiment score:{" "}
                <span className="font-semibold text-slate-600">
                  {item.sentimentScore.toFixed(2)}
                </span>
              </div>
            )}
          </article>
        ))}
      </div>
    )}
  </section>
)}

        {/* Empty state */}
        {!searchedQuestion && !loading && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white">
              L
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-950">
              Your customer feedback, ready to explore
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Ask questions above to retrieve relevant customer feedback and
              generate an evidence-backed answer. 
            </p>
          </section>
        )}
      </div>
    </main>
  );
}