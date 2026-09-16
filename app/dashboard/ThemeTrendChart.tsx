"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ThemeTrendItem = {
  themeId: string;
  theme: string;
  color: string | null;
  date: string;
  count: number;
};

type ThemeTrendChartProps = {
  data: ThemeTrendItem[];
};

type WeeklyThemeData = {
  week: string;
  [key: string]: string | number;
};

type ThemeInfo = {
  id: string;
  name: string;
  color: string;
};

export default function ThemeTrendChart({
  data,
}: ThemeTrendChartProps) {
  const themes = getThemes(data);
  const weeklyData = getWeeklyThemeData(data, themes);

  const spikes = getThemeSpikes(weeklyData, themes);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Theme Trends
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Weekly feedback volume by customer theme.
        </p>
      </div>

      {spikes.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Theme spike detected
          </p>

          <p className="mt-1 text-sm text-amber-800">
            {spikes.map((spike, index) => (
              <span key={`${spike.themeId}-${spike.week}`}>
                <strong>{spike.theme}</strong> increased significantly
                during <strong>{spike.week}</strong>
                {index < spikes.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>
      )}

      {weeklyData.length === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-gray-500">
            No theme trend data available.
          </p>
        </div>
      ) : (
        <>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weeklyData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
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
                />

                {themes.map((theme) => (
                  <Line
                    key={theme.id}
                    type="monotone"
                    dataKey={theme.id}
                    name={theme.name}
                    stroke={theme.color}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                    }}
                    activeDot={{
                      r: 5,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="flex items-center gap-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: theme.color,
                  }}
                />

                <span className="text-xs font-medium text-gray-600">
                  {theme.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getThemes(
  data: ThemeTrendItem[]
): ThemeInfo[] {
  const themeMap = new Map<string, ThemeInfo>();

  for (const item of data) {
    if (!themeMap.has(item.themeId)) {
      themeMap.set(item.themeId, {
        id: item.themeId,
        name: item.theme,
        color: item.color || "#111827",
      });
    }
  }

  return Array.from(themeMap.values());
}

function getWeeklyThemeData(
  data: ThemeTrendItem[],
  themes: ThemeInfo[]
): WeeklyThemeData[] {
  const weeklyMap = new Map<
    string,
    Map<string, number>
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

    const weekKey = weekStart
      .toISOString()
      .slice(0, 10);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, new Map());
    }

    const themeMap = weeklyMap.get(weekKey)!;

    themeMap.set(
      item.themeId,
      (themeMap.get(item.themeId) || 0) + item.count
    );
  }

  return Array.from(weeklyMap.entries())
    .sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    )
    .map(([weekStart, themeCounts]) => {
      const result: WeeklyThemeData = {
        week: new Date(
          `${weekStart}T00:00:00`
        ).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      };

      for (const theme of themes) {
        result[theme.id] =
          themeCounts.get(theme.id) || 0;
      }

      return result;
    });
}

function getThemeSpikes(
  weeklyData: WeeklyThemeData[],
  themes: ThemeInfo[]
) {
  const spikes: {
    themeId: string;
    theme: string;
    week: string;
  }[] = [];

  for (const theme of themes) {
    for (let index = 4; index < weeklyData.length; index++) {
      const current =
        Number(weeklyData[index][theme.id]) || 0;

      const previousWeeks = weeklyData
        .slice(index - 4, index)
        .map(
          (week) =>
            Number(week[theme.id]) || 0
        );

      const previousAverage =
        previousWeeks.reduce(
          (sum, value) => sum + value,
          0
        ) / previousWeeks.length;

      const increase =
        current - previousAverage;

      const isSpike =
        previousAverage > 0 &&
        current >= previousAverage * 1.5 &&
        increase >= 2;

      if (isSpike) {
        spikes.push({
          themeId: theme.id,
          theme: theme.name,
          week: weeklyData[index].week,
        });
      }
    }
  }

  return spikes;
}