"use client";

import { useEffect, useState } from "react";
import FeedbackTrendChart from "./FeedbackTrendChart";
import SentimentChart from "./SentimentChart";
import ChannelChart from "./ChannelChart";
import ThemeTrendChart from "./ThemeTrendChart";

type AnalyticsData = {
  summary: {
    totalFeedback: number;
    positiveFeedback: number;
    neutralFeedback: number;
    negativeFeedback: number;
    sentimentPercentages: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };

  feedbackByChannel: {
    channel: string;
    count: number;
  }[];

  feedbackByStatus: {
    status: "NEW" | "REVIEWED" | "ACTIONED";
    count: number;
  }[];

  feedbackOverTime: {
    date: string;
    count: number;
  }[];

    themeTrends: {
    themeId: string;
    theme: string;
    color: string | null;
    date: string;
    count: number;
  }[];
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 async function loadAnalytics() {
  try {
    setLoading(true);
    setError("");

    const response = await fetch("/api/analytics");

    if (!response.ok) {
      throw new Error("Failed to load analytics");
    }

    const analytics: AnalyticsData =
      await response.json();

    setData(analytics);
  } catch (error) {
    console.error(error);
    setError("Unable to load analytics");
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadAnalytics();
}, []);

  if (loading) {
    return (
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Loading analytics...
        </p>
      </div>
    );
  }

 if (error) {
  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-800">
            Unable to load analytics
          </p>

          <p className="mt-1 text-xs text-red-600">
            Please try again. If the problem continues, check your
            connection or try again later.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
          className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Retrying..." : "Try again"}
        </button>
      </div>
    </div>
  );
}

  if (!data) {
    return null;
  }

  const {
  summary,
  feedbackByChannel,
  feedbackByStatus,
  feedbackOverTime,
  themeTrends,
} = data;

  return (
    <section className="mt-8">
      {/* Heading */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Feedback Analytics
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Overview of customer feedback across your workspace.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Feedback"
          value={summary.totalFeedback}
        />

        <MetricCard
          title="Positive"
          value={summary.positiveFeedback}
          subtitle={`${summary.sentimentPercentages.positive}%`}
        />

        <MetricCard
          title="Neutral"
          value={summary.neutralFeedback}
          subtitle={`${summary.sentimentPercentages.neutral}%`}
        />

        <MetricCard
          title="Negative"
          value={summary.negativeFeedback}
          subtitle={`${summary.sentimentPercentages.negative}%`}
        />
      </div>

      {/* Channel + Status */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChannelChart data={feedbackByChannel} />

        <StatusCard
          data={feedbackByStatus}
          total={summary.totalFeedback}
        />
      </div>

      {/* Trend + Sentiment */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FeedbackTrendChart data={feedbackOverTime} />

        <SentimentChart
          positive={summary.positiveFeedback}
          neutral={summary.neutralFeedback}
          negative={summary.negativeFeedback}
        />
      </div>

      {/* Theme Trends */}
      <div className="mt-6">
        <ThemeTrendChart data={themeTrends} />
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-600">
        {title}
      </p>

      <p className="mt-2 text-3xl font-semibold text-gray-900">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">
          {subtitle} of analyzed feedback
        </p>
      )}
    </div>
  );
}

function StatusCard({
  data,
  total,
}: {
  data: {
    status: "NEW" | "REVIEWED" | "ACTIONED";
    count: number;
  }[];
  total: number;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Feedback by Status
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Current workflow status of feedback records.
        </p>
      </div>

      <div className="space-y-5">
        {data.map((item) => {
          const percentage =
            total > 0
              ? (item.count / total) * 100
              : 0;

          return (
            <div key={item.status}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {formatStatus(item.status)}
                </span>

                <span className="text-sm font-semibold text-gray-900">
                  {item.count}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {percentage.toFixed(1)}% of all feedback
              </p>
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="text-sm text-gray-500">
            No status data available.
          </p>
        )}
      </div>
    </div>
  );
}

function formatStatus(
  status: "NEW" | "REVIEWED" | "ACTIONED"
) {
  if (status === "NEW") {
    return "New";
  }

  if (status === "REVIEWED") {
    return "Reviewed";
  }

  return "Actioned";
}