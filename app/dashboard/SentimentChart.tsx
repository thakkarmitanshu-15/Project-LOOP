"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SentimentChartProps = {
  positive: number;
  neutral: number;
  negative: number;
};

export default function SentimentChart({
  positive,
  neutral,
  negative,
}: SentimentChartProps) {
  const data = [
    {
      name: "Positive",
      value: positive,
    },
    {
      name: "Neutral",
      value: neutral,
    },
    {
      name: "Negative",
      value: negative,
    },
  ].filter((item) => item.value > 0);

  const total = positive + neutral + negative;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Sentiment Distribution
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Overall customer sentiment across feedback.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-gray-500">
            No sentiment data available.
          </p>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={2}
              >
                <Cell fill="#16a34a" />
                <Cell fill="#9ca3af" />
                <Cell fill="#dc2626" />
              </Pie>

              <Tooltip
                formatter={(value, name) => [
                  `${value} feedback`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="-mt-4 flex justify-center gap-6">
            <LegendItem
              label="Positive"
              value={positive}
              total={total}
              className="bg-green-600"
            />

            <LegendItem
              label="Neutral"
              value={neutral}
              total={total}
              className="bg-gray-400"
            />

            <LegendItem
              label="Negative"
              value={negative}
              total={total}
              className="bg-red-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percentage =
    total > 0
      ? ((value / total) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${className}`}
      />

      <div>
        <p className="text-xs font-medium text-gray-700">
          {label}
        </p>

        <p className="text-xs text-gray-500">
          {percentage}%
        </p>
      </div>
    </div>
  );
}