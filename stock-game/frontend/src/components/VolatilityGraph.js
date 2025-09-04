import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const VolatilityGraph = () => {
  const [volHistory, setVolHistory] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/stocks?limit=50&random=true`);
        const stocks = res.data || [];

        const volatilities = stocks
          .map((s) => s.volatility)
          .filter((v) => typeof v === "number" && v > 0);

        if (!volatilities.length) return;

        const avgVol =
          volatilities.reduce((a, b) => a + b, 0) / volatilities.length;

        setVolHistory((prev) => {
          const next = [...prev, { time: Date.now(), avgVol }];
          return next.slice(-100);
        });
      } catch (err) {
        console.error("⚠️ Failed to fetch volatility data:", err.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: volHistory.map((v) =>
      new Date(v.time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    ),
    datasets: [
      {
        label: "Average Volatility",
        data: volHistory.map((v) => v.avgVol),
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        pointRadius: 2,
        borderWidth: 2,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 0.05,
        ticks: {
          color: "#ccc", // light gray text
        },
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
      x: {
        ticks: {
          color: "#aaa",
          autoSkip: true,
          maxTicksLimit: 10,
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#f97316", // orange text
          boxWidth: 12,
        },
        position: "top",
        align: "end",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    animation: false,
  };

  return (
    <div
      style={{
        background: "#111",
        borderRadius: "8px",
        padding: "20px",
        marginTop: "40px",
        marginBottom: "40px",
        boxShadow: "0 0 12px rgba(0,0,0,0.3)",
      }}
    >
      <h3 style={{ color: "#fff", textAlign: "center", marginBottom: "20px" }}>
        📈 Market Volatility Graph
      </h3>
      <div style={{ height: "300px" }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default VolatilityGraph;
