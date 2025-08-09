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
import "chartjs-adapter-date-fns";
import API_BASE_URL from "../apiConfig";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

// Fetch mood + history from backend
const fetchMoodData = async () => {
  const res = await fetch(`${API_BASE_URL}/api/market-data/mood`);
  const data = await res.json(); // { mood, moodHistory: [{ mood, value, timestamp }, ...] }
  return data;
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

  // Data points carry mood text so tooltips can access it
  const points = moodHistory.map((entry) => ({
    x: entry.timestamp,
    y: entry.value,
    mood: entry.mood,
  }));

  const chartData = {
    labels: points.map((p) => `T-${p.x}`),
    datasets: [
      {
        label: "Market Mood (0 = bearish, 1 = bullish)",
        data: points,
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          stepSize: 0.1,
          callback: (value) => `${(value * 100).toFixed(0)}%`,
        },
        title: { display: true, text: "Bullishness %" },
      },
      x: {
        title: { display: true, text: "Market Updates (Recent → Left)" },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const moodAtTick = ctx.raw.mood || "Unknown";
            const pct = (ctx.parsed.y * 100).toFixed(1);
            return `${moodAtTick} — ${pct}% bullish`;
          },
          title: (items) => {
            const idx = items?.[0]?.dataIndex ?? 0;
            const entry = moodHistory[idx];
            return entry ? `Tick ${entry.timestamp}` : "";
          },
        },
      },
      legend: { display: false },
    },
  };

  return (
    <div style={{ height: "250px", width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Market Mood (Last {moodHistory.length} Updates)</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
