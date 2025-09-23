// src/components/PortfolioBalanceGraph.jsx
import React, { useMemo, useState } from "react";
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
import { useTick } from "../TickProvider";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

const USER_ID = getOrCreateUserId();

/* ---------- API ---------- */
async function fetchPortfolio() {
  const res = await fetch(`${API_BASE_URL}/api/portfolio/${USER_ID}`);
  if (!res.ok) throw new Error("Portfolio fetch failed");
  return res.json();
}

/* ---------- helpers ---------- */
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
    case "call_expire":
    case "put_expire":
      return +Math.abs(total || 0);
    default:
      return 0;
  }
}

function buildCashSeries(data, windowLen, tick) {
  const currentTick = typeof tick === "number" ? tick : 1;
  const endTick = Math.max(1, currentTick);
  const startTick = Math.max(1, endTick - windowLen + 1);

  const flowsByTick = new Map();
  for (const tx of data?.transactions || []) {
    const t = tx.tickOpened ?? tx.tick ?? null;
    if (!t || t < startTick || t > endTick) continue;

    const flow = cashFlowOf(tx);
    flowsByTick.set(t, (flowsByTick.get(t) || 0) + flow);
  }

  const endCash = Number.isFinite(data?.balance) ? data.balance : 10_000;
  let sumFlows = 0;
  for (let t = startTick; t <= endTick; t++) {
    sumFlows += flowsByTick.get(t) || 0;
  }

  const startCash = endCash - sumFlows;

  const values = [];
  const labels = [];
  let cash = startCash;
  for (let t = startTick; t <= endTick; t++) {
    const flow = flowsByTick.get(t) || 0;
    cash += flow;
    values.push(cash);
    labels.push(`Tick ${t}`);
  }

  return { values, labels };
}

const fmt = (v) => {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)} T`;
  if (a >= 1e9 ) return `$${(v / 1e9 ).toFixed(1)} B`;
  if (a >= 1e6 ) return `$${(v / 1e6 ).toFixed(1)} M`;
  if (a >= 1e3 ) return `$${(v / 1e3 ).toFixed(1)} K`;
  return `$${v.toFixed(2)}`;
};

/* ---------- Component ---------- */
export default function PortfolioBalanceGraph({ size = "small" }) {
  const { tick } = useTick(); // ⏱️ current market tick
  const [range, setRange] = useState("M"); // W | M | ALL

  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio", USER_ID, range, tick], // 🔁 react to tick
    queryFn: fetchPortfolio,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { values, labels } = useMemo(() => {
    if (!data || typeof tick !== "number") return { values: [], labels: [] };

    const windows = { W: 120, M: 480, ALL: 1200 };
    const len = windows[range] ?? 480;

    const result = buildCashSeries(data, len, tick);
    if (result.values.length < 2 && Number.isFinite(data.balance)) {
      return {
        values: [data.balance, data.balance],
        labels: ["Tick 1", "Tick 2"],
      };
    }
    return result;
  }, [data, range, tick]);

  const vMin = values.length ? Math.min(...values) : 0;
  const vMax = values.length ? Math.max(...values) : 1;
  const pad = Math.max((vMax - vMin) * 0.08, (vMax || 1) * 0.02);
  const net = values.length ? values.at(-1) - values[0] : 0;
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
