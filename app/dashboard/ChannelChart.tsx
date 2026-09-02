"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChannelChartProps = {
  data: {
    channel: string;
    count: number;
  }[];
};

export default function ChannelChart({
  data,
}: ChannelChartProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Feedback by Channel
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Number of feedback records received from each channel.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-gray-500">
            No channel data available.
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="channel"
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
                cursor={{ fill: "rgba(17, 24, 39, 0.05)" }}
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

              <Bar
                dataKey="count"
                fill="#111827"
                radius={[6, 6, 0, 0]}
                maxBarSize={55}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}