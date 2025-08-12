// src/components/PortfolioBalanceGraph.jsx
import React, { useMemo, useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import "chartjs-adapter-date-fns";
import "../styles/portfoliobalancegraph.css";
import { getOrCreateUserId } from "../userId";
import API_BASE_URL from "../apiConfig";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

const USER_ID = getOrCreateUserId();

/* ---------- API ---------- */
async function fetchPortfolio() {
  const res = await fetch(`${API_BASE_URL}/api/portfolio/${USER_ID}`);
  if (!res.ok) throw new Error("Portfolio fetch failed");
  return res.json();
}

/* ---------- helpers ---------- */

// normalize a tx into a signed cash flow (inflow = +, outflow = -)
function cashFlowOf(tx) {
  const total = tx.total ?? ((tx.price || 0) * (tx.shares || tx.contracts || 0));
  switch (tx.type) {
    case "buy":
    case "short":
    case "fee":
    case "interest":
      return -Math.abs(total || 0);
    case "sell":
    case "cover":
    case "dividend_credit":
    case "call_expire":   // treat expiries as inflow of remaining value if you record it
    case "put_expire":
      return +Math.abs(total || 0);
    default:
      return 0;
  }
}

/**
 * Build a consistent cash series of length windowLen:
 *  - Choose [startTick..endTick] ending at currentTick
 *  - Sum cash flows in window
 *  - Solve startCash = endCash - sum(flows)
 *  - Simulate forward: cash[t] = cash[t-1] + flow[t]
 */
function buildCashSeries(data, windowLen) {
  const currentTick = Number.isFinite(data?.currentTick)
    ? data.currentTick
    : (Array.isArray(data?.transactions) && data.transactions.length
        ? Math.max(...data.transactions.map(tx => tx.tickOpened ?? 1))
        : 1);

  const endTick = Math.max(1, currentTick);
  const startTick = Math.max(1, endTick - windowLen + 1);

  // group flows by tick within window
  const flowsByTick = new Map();
  for (const tx of data?.transactions || []) {
    const t = tx.tickOpened ?? tx.tick ?? null;
    if (!t || t < startTick || t > endTick) continue;
    flowsByTick.set(t, (flowsByTick.get(t) || 0) + cashFlowOf(tx));
  }

  const endCash = Number.isFinite(data?.balance) ? data.balance : 10_000;
  let sumFlows = 0;
  for (let t = startTick; t <= endTick; t++) sumFlows += (flowsByTick.get(t) || 0);

  // solve for starting cash that makes simulation end at endCash
  let cash = endCash - sumFlows;

  const values = [];
  const labels = [];
  for (let t = startTick; t <= endTick; t++) {
    cash += (flowsByTick.get(t) || 0);
    values.push(cash);
    labels.push(`Tick ${t}`);
  }
  return { values, labels };
}

/* ---------- compact currency formatter ---------- */
const fmt = (v) => {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)} T`;
  if (a >= 1e9 ) return `$${(v / 1e9 ).toFixed(1)} B`;
  if (a >= 1e6 ) return `$${(v / 1e6 ).toFixed(1)} M`;
  if (a >= 1e3 ) return `$${(v / 1e3 ).toFixed(1)} K`;
  return `$${v.toFixed(2)}`;
};

/* ---------- component ---------- */
export default function PortfolioBalanceGraph({ size = "small" }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio", USER_ID],
    queryFn: fetchPortfolio,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const [range, setRange] = useState("M"); // W | M | ALL

  const { values, labels } = useMemo(() => {
    if (!data) return { values: [], labels: [] };

    // Pick window sizes (assuming ~24 ticks/day; tweak as needed)
    const windows = { W: 120, M: 480, ALL: 1200 };
    const len = windows[range] ?? 480;

    // Always return at least 2 points so Chart.js renders a line
    const { values, labels } = buildCashSeries(data, len);
    if (values.length < 2 && Number.isFinite(data.balance)) {
      return {
        values: [data.balance, data.balance],
        labels: ["Tick 1", "Tick 2"],
      };
    }
    return { values, labels };
  }, [data, range]);

  // chart options
  const vMin = values.length ? Math.min(...values) : 0;
  const vMax = values.length ? Math.max(...values) : 1;
  const pad = Math.max((vMax - vMin) * 0.08, (vMax || 1) * 0.02);
  const net = values.length ? values[values.length - 1] - values[0] : 0;
  const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#9aa0a6";

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.25,
        cubicInterpolationMode: "monotone",
        fill: false,
        clip: 8,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, right: 6, bottom: 4, left: 6 } },
    scales: {
      x: { display: false, grid: { display: false } },
      y: {
        display: false,
        grid: { display: false },
        min: vMin - pad,
        max: vMax + pad,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#101214",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 8,
        callbacks: {
          label: (ctx) => fmt(ctx.parsed.y),
        },
      },
    },
  };

  const height = size === "small" ? 160 : size === "large" ? 240 : 200;

  if (isLoading) return <p>📈 Loading…</p>;
  if (error) return <p>⚠️ Graph error.</p>;

  return (
    <div className={`portfolio-graph ${size}`}>
      <div className="range-buttons">
        {["W", "M", "ALL"].map((id) => (
          <button
            key={id}
            onClick={() => setRange(id)}
            className={`range-button ${id === range ? "active" : ""}`}
          >
            {id === "W" ? "Week" : id === "M" ? "Month" : "All"}
          </button>
        ))}
      </div>

      {/* Fixed-height wrapper: Chart.js reads height from parent */}
      <div className="pbg-canvas" style={{ height }}>
        {values.length >= 2 ? (
          <Line data={chartData} options={options} />
        ) : (
          <p>No history yet.</p>
        )}
      </div>
    </div>
  );
}
