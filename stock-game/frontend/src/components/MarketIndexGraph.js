import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import "../styles/marketIndexGraph.css";
import API_BASE_URL from "../apiConfig";
const fetchMarketIndex = async () => {
  const res = await fetch(`${API_BASE_URL}/api/market-data/index`);
  if (!res.ok) throw new Error("Failed to fetch market index");
  return res.json();
};

const INTERVAL_OPTIONS = [

  { label: "5D", value: 5 },
  { label: "1M", value: 21 },
  { label: "6M", value: 126 },
  { label: "YTD", value: "ytd" },   // Optional: requires logic
  { label: "1Y", value: 252 },
  { label: "5Y", value: 1260 },
  { label: "All", value: "all" }
];

const MarketIndexGraph = () => {
  const [interval, setInterval] = useState("30");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["marketIndex"],
    queryFn: fetchMarketIndex,
    refetchInterval: 30000
  });

  if (isLoading) return <p>Loading Market Index...</p>;
  if (error) return <p>Error loading Market Index</p>;

  // Filter based on tick window
  const filteredData = (() => {
    if (interval === "all") return data;
    if (interval === "ytd") {
      // You could use a backend "current tick" endpoint and
      // start of year tick here for more accuracy!
      return data;
    }
    const count = parseInt(interval, 10);
    return data.slice(-count);
  })();

  // Fallback tick calculation: oldest tick in filtered window
  const totalTicks = data.length;
  const firstTick = totalTicks - filteredData.length + 1;

  // Labels: prefer entry.tick, fallback to calculated
  const labels = filteredData.map((entry, i) =>
    entry.tick !== undefined
      ? `Tick ${entry.tick}`
      : `Tick ${firstTick + i}`
  );

  const prices = filteredData.map(entry => entry.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const rangePadding = (maxPrice - minPrice) * 0.1 || 1;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Overall Market Price Index",
        data: prices,
        borderColor: "#3f51b5",
        backgroundColor: "rgba(63, 81, 181, 0.1)",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: "#fff",
        titleColor: "#000",
        bodyColor: "#000",
        borderColor: "#3f51b5",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: context => `Index: $${context.raw.toFixed(2)}`
        }
      },
      legend: { display: false }
    },
    scales: {
      y: {
        min: minPrice - rangePadding,
        max: maxPrice + rangePadding,
        ticks: { callback: val => `$${Number(val).toFixed(2)}` }
      }
    }
  };

  return (
    <div style={{ height: "250px", width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Overall Market Price Index</h3>
      <div className="interval-buttons">
        {INTERVAL_OPTIONS.map(({ label, value }) => (
          <button
            key={label}
            className={`interval-button ${interval === value ? "active" : ""}`}
            onClick={() => setInterval(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MarketIndexGraph;