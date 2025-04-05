import React from 'react';
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

const fetchStockData = async (ticker) => {
  const res = await fetch(`http://localhost:5000/api/stocks/${ticker}`);
  if (!res.ok) throw new Error("Stock data fetch failed");
  return res.json();
};

const StockGraph = ({ ticker }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", ticker],
    queryFn: () => fetchStockData(ticker),
    enabled: !!ticker
  });

  if (isLoading) return <p>Loading chart...</p>;
  if (error) return <p>Chart error.</p>;
  if (!data || !Array.isArray(data.history) || data.history.length < 2) return null;

  const history = data.history.slice(-30); // recent prices
  const labels = history.map((_, i) => i + 1);

  const firstPrice = history[0];
  const lastPrice = history[history.length - 1];
  const lineColor = lastPrice < firstPrice ? "#f44336" : "#4caf50"; // red if price dropped

  const chartData = {
    labels,
    datasets: [{
      label: `${ticker} (30 updates)`,
      data: history,
      borderColor: lineColor,
      tension: 0.3,
      pointRadius: 0,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (val) => `$${val.toFixed(2)}`
        }
      }
    }
  };

  return (
    <div style={{ height: "150px", width: "100%" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default StockGraph;
