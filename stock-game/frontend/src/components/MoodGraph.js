import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

// Fetch mood history from backend
const fetchMoodHistory = async () => {
  const res = await fetch("http://localhost:5000/api/market-data/mood");
  const data = await res.json();
  return data.moodHistory;
};

const MoodGraph = () => {
  const { data: moodHistory = [], isLoading, error } = useQuery({
    queryKey: ["moodHistory"],
    queryFn: fetchMoodHistory,
    refetchInterval: 5000,
  });

  if (isLoading) return <p>Loading market mood...</p>;
  if (error) return <p>Error loading market mood.</p>;
  if (!Array.isArray(moodHistory) || moodHistory.length === 0)
    return <p>No mood history yet.</p>;

  const values = moodHistory.map((entry) => entry.value);
  const labels = moodHistory.map((_, index) => `T-${30 - index}`); // e.g., T-30 to T-1

  const data = {
    labels,
    datasets: [
      {
        label: "Market Mood (0 = bearish, 1 = bullish)",
        data: values,
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
        title: {
          display: true,
          text: "Bullishness %",
        },
      },
      x: {
        title: {
          display: true,
          text: "Market Updates (Recent → Left)",
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `Sentiment: ${(ctx.parsed.y * 100).toFixed(1)}% bullish`,
        },
      },
    },
  };

  return (
    <div style={{ height: "250px", width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Market Mood (Last 30 Updates)</h3>
      <Line data={data} options={options} />
    </div>
  );
};

export default MoodGraph;
