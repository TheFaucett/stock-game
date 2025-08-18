// src/components/MoodGraph.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import API_BASE_URL from "../apiConfig";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

// Fetch mood + history from backend
const fetchMoodData = async () => {
  const res = await fetch(`${API_BASE_URL}/api/market-data/mood`);
  if (!res.ok) throw new Error("failed to load mood");
  return res.json(); // { mood, moodHistory: [{ mood, value, timestamp }, ...] }
};

export default function MoodGraph() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["moodHistory"],
    queryFn: fetchMoodData,
    refetchInterval: 30000,
  });

  if (isLoading) return <p>Loading market mood...</p>;
  if (error) return <p>Error loading market mood.</p>;

  const moodHistory = Array.isArray(data?.moodHistory) ? data.moodHistory : [];
  if (moodHistory.length === 0) return <p>No mood history yet.</p>;

  // Use a simple integer index for the x-axis (clean labels).
  // Keep the original timestamp on each point for tooltips.
  const points = moodHistory.map((entry, i) => ({
    x: i + 1,            // linear index -> nice axis
    y: entry.value,
    mood: entry.mood,
    ts: entry.timestamp, // keep original for tooltip
  }));

  const chartData = {
    datasets: [
      {
        label: "Market Mood",
        data: points,                       // {x,y} points
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.25,
        fill: true,
        parsing: { xAxisKey: "x", yAxisKey: "y" },
      },
    ],
  };

  const n = points.length;
  const maxTicks = 8; // how many x labels to display
  const step = Math.max(1, Math.round(n / maxTicks));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          stepSize: 0.1,
          callback: (v) => `${(v * 100).toFixed(0)}%`,
        },
        title: { display: true, text: "Bullishness %" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      x: {
        type: "linear",
        suggestedMin: 1,
        suggestedMax: n,
        ticks: {
          precision: 0,                   // integers only
          maxTicksLimit: maxTicks,
          callback: (val) => {
            // Show every "step"-th index as "T-<relative>"
            const idx = Number(val);
            if (!Number.isInteger(idx)) return "";
            if (idx % step !== 0 && idx !== 1 && idx !== n) return "";
            const rel = n - idx;         // 0 = most recent
            return rel === 0 ? "now" : `T-${rel}`;
          },
        },
        title: { display: true, text: "Market Updates (older → newer)" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = (ctx.parsed.y * 100).toFixed(1);
            const moodAt = ctx.raw?.mood || "—";
            return `${moodAt} — ${pct}% bullish`;
          },
          title: ([item]) => {
            const raw = item.raw;
            if (!raw) return "";
            const rel = n - raw.x;
            const tag = rel === 0 ? "now" : `T-${rel}`;
            return `Update ${tag}${raw.ts != null ? ` • ts: ${raw.ts}` : ""}`;
          },
        },
      },
    },
    elements: {
      line: { borderWidth: 2 },
      point: { hitRadius: 8, hoverBorderWidth: 2 },
    },
  };

  return (
    <div style={{ height: 250, width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Market Mood (Last {moodHistory.length} Updates)</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
