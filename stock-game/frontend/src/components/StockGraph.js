// src/components/StockGraph.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";
import CandleChart from "./CandleChart";

function getLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ?? fallback; }
  catch { return fallback; }
}
function setLS(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

async function fetchStockData(ticker) {
  const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
  if (!res.ok) throw new Error("Stock data fetch failed");
  return res.json();
}

export default function StockGraph({ ticker, history: historyProp }) {
  // Persisted UI state
  const [range, setRange] = useState(() => getLS(`range:${ticker}`, "1M"));
  const [chartType, setChartType] = useState(() => getLS(`chartType:${ticker}`, "line"));
  useEffect(() => {
    setRange(getLS(`range:${ticker}`, "1M"));
    setChartType(getLS(`chartType:${ticker}`, "line"));
  }, [ticker]);
  useEffect(() => { setLS(`range:${ticker}`, range); }, [range, ticker]);
  useEffect(() => { setLS(`chartType:${ticker}`, chartType); }, [chartType, ticker]);

  // If parent (StockDetail) passes history we use that, else we fetch (fallback)
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", ticker],
    queryFn: () => fetchStockData(ticker),
    enabled: !!ticker && !historyProp,
    staleTime: 15000,
    refetchInterval: 30000,
    cacheTime: 60000,
  });

  // Prefer prop; otherwise try data.history if your endpoint includes it
  const sourceHistory = historyProp ?? (Array.isArray(data?.history) ? data.history : []);

  const updateType = useRef("poll");
  const prevHistory = useRef([]);

  const memo = useMemo(() => {
    const history = sourceHistory?.length ? sourceHistory : prevHistory.current;
    if (!history || history.length < 2) {
      return { chartData: null, options: null, historySlice: [] };
    }
    prevHistory.current = history;

    // Map UI ranges to number of points
    const windows = { "5D": 5, "1M": 30, "YTD": 365, "MAX": Infinity };
    const sliceLen = Math.min(windows[range] ?? 30, history.length);
    const slice = history.slice(-sliceLen);
    const startIx = history.length - slice.length;

    // Line chart dataset (Chart.js)
    const labels = slice.map((_, i) => `Tick ${startIx + i + 1}`);
    const net = slice[slice.length - 1] - slice[0];
    const color = net < 0 ? "#f44336" : net > 0 ? "#4caf50" : "#999";
    const animation = updateType.current === "user" ? { duration: 400 } : false;

    return {
      color,
      historySlice: slice,
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
            callbacks: { label: ctx => `Price: $${Number(ctx.raw ?? 0).toFixed(2)}` },
          },
          legend: { display: false },
        },
        scales: {
          y: { ticks: { callback: v => `$${(+v).toFixed(2)}` } },
        },
      },
    };
  }, [sourceHistory, range, ticker]);

  if (isLoading && !historyProp) return <p>Loading chart…</p>;
  if (error) return <p>Chart error.</p>;
  if (!memo.chartData && chartType === "line") return null;

  const handleRange = (id) => {
    updateType.current = "user";
    setRange(id);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <div className="interval-buttons" style={{ display: "flex", gap: 6 }}>
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setChartType("line")}
            className={`interval-button ${chartType === "line" ? "active" : ""}`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("candles")}
            className={`interval-button ${chartType === "candles" ? "active" : ""}`}
          >
            Candles
          </button>
        </div>
      </div>

      {/* Charts */}
      <div style={{ height: 150, width: "100%" }}>
        {chartType === "line" ? (
          <Line data={memo.chartData} options={memo.options} />
        ) : (
          // Feed sliced raw price array to your lightweight-charts CandleChart
          <CandleChart history={memo.historySlice} range={range} height={150} />
        )}
      </div>
    </div>
  );
}
