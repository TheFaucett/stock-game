import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";
async function fetchStockData(ticker) {
  const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
  if (!res.ok) throw new Error("Stock data fetch failed");
  return res.json();
}

export default function StockGraph({ ticker }) {
  const [range, setRange] = useState("1M");
  const updateType = useRef("poll");
  const prevHistory = useRef([]);
  // set a longer interval to reduce flicker
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", ticker],
    queryFn: () => fetchStockData(ticker),
    enabled: !!ticker,
    staleTime: 15000,
    refetchInterval: 30000,
    cacheTime: 60000,
  });

  // Only update chart if history has truly changed!
  const memo = useMemo(() => {
    // Reuse previous history if nothing changed
    const history = (data && Array.isArray(data.history)) ? data.history : prevHistory.current;
    if (!history || history.length < 2) return { chartData: null, options: null };
    prevHistory.current = history; // update cached

    const windows = { "1D": 1, "5D": 5, "1M": 30, "YTD": 365, "MAX": Infinity };
    const slice = history.slice(-Math.min(windows[range], history.length));
    const startIx = history.length - slice.length;
    const labels = slice.map((_, i) => `Tick ${startIx + i + 1}`);
    const net = slice[slice.length - 1] - slice[0];
    const color = net < 0 ? "#f44336" : net > 0 ? "#4caf50" : "#999";
    const animation = updateType.current === "user" ? { duration: 400 } : false;

    return {
      chartData: {
        labels,
        datasets: [{
          label: `${ticker} Price`,
          data: slice,
          borderColor: color,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation,
        plugins: {
          tooltip: {
            backgroundColor: "#fff",
            titleColor: "#000",
            bodyColor: "#000",
            borderColor: color,
            borderWidth: 1,
            padding: 10,
            callbacks: { label: ctx => `Price: $${ctx.raw.toFixed(2)}` },
          },
          legend: { display: false },
        },
        scales: {
          y: { ticks: { callback: v => `$${(+v).toFixed(2)}` } },
        },
      },
    };
  }, [data?.history, range, ticker]);

  if (isLoading) return <p>Loading chart…</p>;
  if (error) return <p>Chart error.</p>;
  if (!memo.chartData) return null;

  function handleRange(id) {
    updateType.current = "user";
    setRange(id);
  }

  return (
    <div style={{ height: 150, width: "100%" }}>
      <div className="interval-buttons">
        {["5D", "1M", "YTD", "MAX"].map(id => (
          <button
            key={id}
            onClick={() => handleRange(id)}
            className={`interval-button ${id === range ? "active" : ""}`}
          >
            {id}
          </button>
        ))}
      </div>
      <Line data={memo.chartData} options={memo.options} />
    </div>
  );
}