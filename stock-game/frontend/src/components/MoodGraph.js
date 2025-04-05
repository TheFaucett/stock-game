import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

// This stays for Y-axis labeling
const moodLabels = {
  "-2": "bearish",
  "-1": "slightly bearish",
  0: "neutral",
  1: "slightly bullish",
  2: "bullish",
};

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
  if (!Array.isArray(moodHistory) || moodHistory.length === 0) return <p>No mood history yet.</p>;

  const values = moodHistory.map(entry => entry.value);
  const labels = moodHistory.map((_, index) => index + 1); // Stable 1–30

  const data = {
    labels,
    datasets: [
      {
        label: "Market Mood Trend",
        data: values,
        borderColor: "#4caf50",
        pointRadius: 3,
        tension: 0.3,
      },
    ],
  };
  console.log(data);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: -2,
        max: 2,
        ticks: {
          stepSize: 1,
          callback: (value) => moodLabels[value] || "",
        },
      },
    },
  };
  console.log("📊 Chart data:", data);

  return (
    <div style={{ height: "250px", width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Market Mood (Last 30 Updates)</h3>
      <Line data={data} options={options} />
    </div>
  );
};

export default MoodGraph;
