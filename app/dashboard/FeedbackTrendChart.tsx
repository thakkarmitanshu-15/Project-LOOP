"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FeedbackTrendChartProps = {
  data: {
    date: string;
    count: number;
  }[];
};

export default function FeedbackTrendChart({
  data,
}: FeedbackTrendChartProps) {
  const weeklyData = getWeeklyData(data);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Feedback Volume Over Time
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Weekly volume of customer feedback received.
        </p>
      </div>

      {weeklyData.length === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-gray-500">
            No time-series data available.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={weeklyData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient
                  id="feedbackGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#111827"
                    stopOpacity={0.25}
                  />

                  <stop
                    offset="100%"
                    stopColor="#111827"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
                labelStyle={{
                  color: "#111827",
                  fontWeight: 600,
                }}
                formatter={(value) => [
                  value,
                  "Feedback",
                ]}
              />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#111827"
                strokeWidth={2}
                fill="url(#feedbackGradient)"
                dot={{
                  r: 3,
                  fill: "#111827",
                }}
                activeDot={{
                  r: 5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function getWeeklyData(
  data: {
    date: string;
    count: number;
  }[]
) {
  const weeklyMap = new Map<
    string,
    {
      startDate: Date;
      count: number;
    }
  >();

  for (const item of data) {
    const date = new Date(`${item.date}T00:00:00`);

    const dayOfWeek = date.getDay();

    const weekStart = new Date(date);

    weekStart.setDate(
      date.getDate() -
        (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );

    weekStart.setHours(0, 0, 0, 0);

    const key = weekStart.toISOString().slice(0, 10);

    const existing = weeklyMap.get(key);

    if (existing) {
      existing.count += item.count;
    } else {
      weeklyMap.set(key, {
        startDate: weekStart,
        count: item.count,
      });
    }
  }

  return Array.from(weeklyMap.values())
    .sort(
      (a, b) =>
        a.startDate.getTime() -
        b.startDate.getTime()
    )
    .map((item) => ({
      week: item.startDate.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
        }
      ),
      count: item.count,
    }));
}