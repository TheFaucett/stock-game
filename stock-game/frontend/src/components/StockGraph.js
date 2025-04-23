import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

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

  const history = data.history.slice(-30);
  const labels = history.map((_, i) => `Tick ${i + 1}`);

  const change = data.change;
  const lineColor = change < 0 ? "#f44336" : change > 0 ? "#4caf50" : "#999";

  const chartData = {
    labels,
    datasets: [
      {
        label: `${ticker} Price`,
        data: history,
        borderColor: lineColor,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'nearest',
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: lineColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => `Price: $${context.raw.toFixed(2)}`
        }
      },
      legend: { display: false }
    },
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
