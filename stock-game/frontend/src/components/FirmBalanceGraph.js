import React, { useMemo, useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import "../styles/firmBalanceGraph.css"; 
import API_BASE_URL from "../apiConfig";
const fmt = v => {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)} T`;
  if (a >= 1e9 ) return `$${(v / 1e9 ).toFixed(1)} B`;
  if (a >= 1e6 ) return `$${(v / 1e6 ).toFixed(1)} M`;
  if (a >= 1e3 ) return `$${(v / 1e3 ).toFixed(1)} K`;
  return `$${v.toFixed(2)}`;
};

// Fetch firm by name
async function fetchFirm(name) {
  console.log(name);
  const res = await fetch(`${API_BASE_URL}/api/firms/${encodeURIComponent(name).trim()}`);
  if (!res.ok) throw new Error("Firm fetch failed");
  const obj = await res.json();
  return obj.firm; // expect: { name, balance, transactions, ... }
}

// Given firm, build balances series by tick (just like portfolio)
function useFirmBalanceSeries(name) {
  const { data, isLoading, error } = useQuery({
    queryKey : ["firm", name],
    queryFn  : () => fetchFirm(name),
    staleTime: 60_000
  });

  const series = useMemo(() => {
    if (!data) return [];
    const initial = data.initialBalance || 100000; // Change if you want!

    const txs = Array.isArray(data.transactions) ? data.transactions : [];
    // Find tick range
    const ticks = txs.map(tx => tx.tickOpened ?? 1);
    const minTick = ticks.length ? Math.min(...ticks) : 1;
    const maxTick = data.currentTick || (ticks.length ? Math.max(...ticks) : 1);

    // Group by tick

    let balance = initial;
    const balances = [balance];

    txs.forEach(tx => {
    if (["buy", "short"].includes(tx.type)) balance -= tx.total;
    else balance += tx.total;
    balances.push(balance);
    });
    return balances;

  }, [data]);

  return { series, isLoading, error };
}

export default function FirmBalanceGraph({ name, size = "small" }) {
  const { series, isLoading, error } = useFirmBalanceSeries(name);
  const [range, setRange] = useState("M");   // W | M | ALL

  const chartRef = useRef(null);
  useEffect(() => () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  }, []);

  if (isLoading) return <p>📈 Loading…</p>;
  if (error)     return <p>⚠️ Graph error.</p>;
  console.log(series.length, series);
  if (series.length < 2) return <p>No history yet.</p>;

  const windowSizes = { W: 7, M: 30, ALL: series.length };
  const slice = series.slice(-windowSizes[range]);
  const startIdx = series.length - slice.length;
  const labels = slice.map((_, i) => `Tick ${startIdx + i + 1}`);

  const first = slice[0];
  const last  = slice[slice.length - 1];
  const net   = last - first;
  const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#aaaaaa";

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
    <div className="firm-balance-graph-container">
      <div className="firm-balance-title">{name}</div>
      <div className="range-buttons">
        {["W", "M", "ALL"].map(id => (
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
        id={`firm-balance-${name}`}
        ref={el => (chartRef.current = el)}
        data={data}
        options={options}
        style={{ minHeight: 220, maxHeight: 320, width: "100%" }}
      />
    </div>
  );
}
