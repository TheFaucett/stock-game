// src/components/StockGraph.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";
import CandleChart from "./CandleChart";

/* ---------------- localStorage helpers ---------------- */
function getLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function setLS(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

/* ---------------- fetcher ---------------- */
async function fetchStockData(ticker) {
  const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
  if (!res.ok) throw new Error("Stock data fetch failed");
  return res.json();
}

/**
 * StockGraph
 * Props:
 *  - ticker (required)
 *  - history?: number[]  (optional raw price array; if omitted we fetch)
 *  - height?: number     (default 150)
 *  - showTypeToggle?: boolean (default true)  show Line/Candles buttons
 *  - compact?: boolean   (default false)      hides axes & grids, tighter padding
 */
export default function StockGraph({
  ticker,
  history: historyProp,
  height = 150,
  showTypeToggle = true,
  compact = false,
}) {
  // Persist UI state per ticker
  const [range, setRange] = useState(() => getLS(`range:${ticker}`, "1M"));
  const [chartTypeState, setChartTypeState] = useState(() =>
    getLS(`chartType:${ticker}`, "line")
  );
  // If we’re not showing the type toggle (e.g., sidebar), force line
  const chartType = showTypeToggle ? chartTypeState : "line";

  useEffect(() => {
    setRange(getLS(`range:${ticker}`, "1M"));
    setChartTypeState(getLS(`chartType:${ticker}`, "line"));
  }, [ticker]);
  useEffect(() => {
    setLS(`range:${ticker}`, range);
  }, [range, ticker]);
  useEffect(() => {
    if (showTypeToggle) setLS(`chartType:${ticker}`, chartType);
  }, [chartType, ticker, showTypeToggle]);

  // Fetch when history prop not provided
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", ticker],
    queryFn: () => fetchStockData(ticker),
    enabled: !!ticker && !historyProp,
    staleTime: 15000,
    refetchInterval: 30000,
    cacheTime: 60000,
  });

  // prefer prop, fallback to API’s history
  const sourceHistory = historyProp ?? (Array.isArray(data?.history) ? data.history : []);

  // Keep last good history so the chart doesn’t disappear between polls
  const updateType = useRef("poll");
  const prevHistory = useRef([]);

  const memo = useMemo(() => {
    const history = sourceHistory?.length ? sourceHistory : prevHistory.current;
    if (!history || history.length < 2) {
      return { chartData: null, options: null, historySlice: [] };
    }
    prevHistory.current = history;

    // Map UI ranges to point counts
    const windows = { "5D": 5, "1M": 30, "YTD": 365, "MAX": Infinity };

    // For compact (sidebar), don’t cram too many points in a 250px column
    const effectiveRange = compact
      ? Math.min(windows[range] ?? 30, 120)
      : windows[range] ?? 30;

    const sliceLen = Math.min(effectiveRange, history.length);
    const slice = history.slice(-sliceLen);
    const startIx = history.length - slice.length;

    const labels = slice.map((_, i) => `Tick ${startIx + i + 1}`);
    const net = slice[slice.length - 1] - slice[0];
    const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#9aa0a6";

    const animation = updateType.current === "user" ? { duration: 400 } : false;

    // Compute padded y-range (prevents cramped look)
    const yMin = Math.min(...slice);
    const yMax = Math.max(...slice);
    const yPad = Math.max((yMax - yMin) * 0.08, (yMax || 1) * 0.02);
    const yDomain = [yMin - yPad, yMax + yPad];

    const chartData = {
      labels,
      datasets: [
        {
          label: `${ticker} Price`,
          data: slice,
          borderColor: color,
          backgroundColor: "transparent", // no area fill in compact
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          // Use monotone to avoid Bezier overshoot at the edges
          tension: compact ? 0.25 : 0.3,
          cubicInterpolationMode: "monotone",
          fill: false,
          clip: 8, // clip to avoid first control point drawing outside
          spanGaps: false,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation,
      plugins: {
        tooltip: {
          backgroundColor: "#101214",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: color,
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: (ctx) => `Price: $${Number(ctx.raw ?? 0).toFixed(2)}`,
          },
        },
        legend: { display: false },
      },
      layout: compact
        ? { padding: { top: 2, right: 4, bottom: 2, left: 4 } }
        : undefined,
      scales: compact
        ? {
            x: { display: false, grid: { display: false }, ticks: { display: false } },
            y: {
              display: false,
              grid: { display: false },
              ticks: { display: false },
              min: yDomain[0],
              max: yDomain[1],
            },
          }
        : {
            x: { ticks: { maxTicksLimit: 6 } },
            y: {
              ticks: { callback: (v) => `$${(+v).toFixed(2)}` },
              min: yDomain[0],
              max: yDomain[1],
            },
          },
      elements: { line: { borderJoinStyle: "round" } },
    };

    return { color, historySlice: slice, chartData, options };
  }, [sourceHistory, range, ticker, compact]);

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
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <div className="interval-buttons" style={{ display: "flex", gap: 6 }}>
          {["5D", "1M", "YTD", "MAX"].map((id) => (
            <button
              key={id}
              onClick={() => handleRange(id)}
              className={`interval-button ${id === range ? "active" : ""}`}
            >
              {id}
            </button>
          ))}
        </div>

        {showTypeToggle && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              onClick={() => setChartTypeState("line")}
              className={`interval-button ${chartType === "line" ? "active" : ""}`}
            >
              Line
            </button>
            <button
              onClick={() => setChartTypeState("candles")}
              className={`interval-button ${chartType === "candles" ? "active" : ""}`}
            >
              Candles
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height, width: "100%" }}>
        {chartType === "line" ? (
          <Line data={memo.chartData} options={memo.options} />
        ) : (
          <CandleChart history={memo.historySlice} range={range} height={height} />
        )}
      </div>
    </div>
  );
}
