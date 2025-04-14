import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

const fetchMarketIndex = async () => {
  const res = await fetch("http://localhost:5000/api/market-data/index");
  if (!res.ok) throw new Error("Failed to fetch market index");
  return res.json();
};

const MarketIndexGraph = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["marketIndex"],
    queryFn: fetchMarketIndex,
    refetchInterval: 10000
  });

  if (isLoading) return <p>Loading Market Index...</p>;
  if (error) return <p>Error loading Market Index</p>;

  const labels = data.map((_, i) => `T-${30 - i}`);
  const prices = data.map(entry => entry.price);

  // ✅ Calculate min/max for focused Y-axis
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
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: minPrice - rangePadding,
        max: maxPrice + rangePadding,
        ticks: {
          callback: val => `$${Number(val).toFixed(2)}`
        }
      }
    }
  };

  return (
    <div style={{ height: "250px", width: "100%", marginBottom: "1rem" }}>
      <h3>📊 Overall Market Price Index</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MarketIndexGraph;
