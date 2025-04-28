// StockGraph.jsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

/* fetch one stock */
async function fetchStockData(ticker) {
  const res = await fetch(`http://localhost:5000/api/stocks/${ticker}`);
  if (!res.ok) throw new Error("Stock data fetch failed");
  return res.json();                 // { history: [...], change: number }
}

export default function StockGraph({ ticker }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", ticker],
    queryFn : () => fetchStockData(ticker),
    enabled : !!ticker
  });

  const [range, setRange] = useState("1M");        // 1D | 5D | 1M | YTD | MAX

  /* window sizes (ticks) — constant */
  const windows = { "1D": 1, "5D": 5, "1M": 30, "YTD": 365, "MAX": Infinity };

  /* slice history every render so hook order never changes */
  const { history, labels, lineColor } = useMemo(() => {
    if (!data || !Array.isArray(data.history) || data.history.length < 2) {
      return { history: [], labels: [], lineColor: "#999" };
    }

    const raw     = data.history;
    const slice   = raw.slice(-Math.min(windows[range], raw.length));
    const startIx = raw.length - slice.length;
    const labs    = slice.map((_, i) => `Tick ${startIx + i + 1}`);

    const net     = slice[slice.length - 1] - slice[0];
    const color   = net < 0 ? "#f44336" : net > 0 ? "#4caf50" : "#999";

    return { history: slice, labels: labs, lineColor: color };
  }, [data, range]);

  /* guards AFTER the memo so hook order is intact */
  if (isLoading) return <p>Loading chart…</p>;
  if (error)     return <p>Chart error.</p>;
  if (history.length < 2) return null;

  const chartData = {
    labels,
    datasets: [{
      label          : `${ticker} Price`,
      data           : history,
      borderColor    : lineColor,
      tension        : 0.3,
      pointRadius    : 0,
      pointHoverRadius: 6,
      fill           : false
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#000",
        bodyColor : "#000",
        borderColor: lineColor,
        borderWidth: 1,
        padding    : 10,
        callbacks  : { label: ctx => `Price: $${ctx.raw.toFixed(2)}` }
      },
      legend: { display: false }
    },
    scales: {
      y: { ticks: { callback: v => `$${(+v).toFixed(2)}` } }
    }
  };

  return (
    <div style={{ height: 150, width: "100%" }}>
      {/* range buttons (market-index styling) */}
      <div className="interval-buttons">
        {["5D","1M","YTD","MAX"].map(id => (
          <button
            key={id}
            onClick={() => setRange(id)}
            className={`interval-button ${id === range ? "active" : ""}`}
          >
            {id}
          </button>
        ))}
      </div>

      <Line data={chartData} options={options} />
    </div>
  );
}
