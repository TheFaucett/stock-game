// PortfolioBalanceGraph.jsx
import React, { useMemo, useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import "../styles/portfoliobalancegraph.css";
const USER_ID = "67af822e5609849ac14d7942";

/* ---------- fetch portfolio ---------- */
async function fetchPortfolio() {
  const res = await fetch(`http://localhost:5000/api/portfolio/${USER_ID}`);
  if (!res.ok) throw new Error("Portfolio fetch failed");
  return res.json();
}

/* ---------- rebuild cash-balance series ---------- */
function useBalanceSeries() {
  const { data, isLoading, error } = useQuery({
    queryKey : ["portfolio", USER_ID],
    queryFn  : fetchPortfolio,
    staleTime: 60_000
  });

  const series = useMemo(() => {
    if (!data) return [];

    const today = data.balance ?? 0;
    const raw   = Array.isArray(data.transactions) ? data.transactions : [];

    const txs = [...raw].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    let delta = 0;
    const arr = txs.map(tx => {
      delta += ["buy", "short"].includes(tx.type) ? tx.total : -tx.total;
      return today - delta;
    });

    arr.push(today);               // include current balance
    return arr;                    // numbers, oldest → newest
  }, [data]);

  return { series, isLoading, error };
}

/* ---------- compact $ formatter ---------- */
const fmt = v => {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)} T`;
  if (a >= 1e9 ) return `$${(v / 1e9 ).toFixed(1)} B`;
  if (a >= 1e6 ) return `$${(v / 1e6 ).toFixed(1)} M`;
  if (a >= 1e3 ) return `$${(v / 1e3 ).toFixed(1)} K`;
  return `$${v.toFixed(2)}`;
};

/* ---------- main component ---------- */
export default function PortfolioBalanceGraph() {
  const { series, isLoading, error } = useBalanceSeries();
  const [range, setRange] = useState("M");   // W | M | ALL

  /* kill chart on unmount */
  const chartRef = useRef(null);
  useEffect(() => () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  }, []);

  if (isLoading) return <p>📈 Loading…</p>;
  if (error)     return <p>⚠️ Graph error.</p>;
  if (series.length < 2) return <p>No history yet.</p>;

  /* window slices */
  const windowSizes = { W: 7, M: 30, ALL: series.length };
  const slice       = series.slice(-windowSizes[range]);

  /* labels */
  const startIdx = series.length - slice.length;
  const labels   = slice.map((_, i) => `Tick ${startIdx + i + 1}`);

  /* colour ↑↓ */
  const first = slice[0];
  const last  = slice[slice.length - 1];
  const net   = last - first;
  const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#aaaaaa";

  /* y-axis padding */
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const pad = (max - min) * 0.1 || max * 0.05;

  const data = {
    labels,
    datasets: [{
      data           : slice,
      borderColor    : color,
      backgroundColor: `${color}33`,
      tension        : 0.25,
      pointRadius    : 0,
      fill           : true
    }]
  };

  const options = {
    responsive : true,
    scales: {
      y: { min: min - pad, max: max + pad, ticks: { callback: fmt } }
    },
    plugins: {
      legend : { display: false },
      tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } }
    }
  };

  return (
    <div className="portfolio-graph" style={{ width: "100%", height: 150 }}>
      <div className="range-buttons">
      {["W","M","ALL"].map(id => (
          <button
          key={id}
          onClick={() => setRange(id)}
          className={`range-button ${id === range ? "active" : ""}`}
          >
          {id === "W" ? "Week" : id === "M" ? "Month" : "All"}
          </button>
      ))}
      </div>


      <Line
        id={`portfolio-balance-${USER_ID}`}
        ref={el => (chartRef.current = el)}
        data={data}
        options={options}
      />
    </div>
  );
}
