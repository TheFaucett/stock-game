// src/components/StockGraph.jsx
import React, { useMemo, useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";

const DEBUG = false;
const log = (...a) => { if (DEBUG) console.log("[StockGraph]", ...a); };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Fetch tail-only history */
async function fetchTail(ticker, { tail, maxPoints }) {
  const url = `${API_BASE_URL}/api/stocks/${encodeURIComponent(ticker)}/history?tail=${tail}&maxPoints=${maxPoints}`;
  log("GET", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`History fetch failed (${res.status})`);
  const json = await res.json(); // { ticker, points, meta:{tail, returned, overallTotal} }
  log("resp.meta", json?.meta, "points.len", Array.isArray(json?.points) ? json.points.length : 0);
  return json;
}

/**
 * Props:
 *  - ticker (required)
 *  - height?: number (default 260)
 *  - compact?: boolean (default false) hides axes
 */
export default function StockGraph({ ticker, height = 260, compact = false }) {
  // Range → ticks (1 tick ≈ 1 day)
  const [range, setRange] = useState("1M");
  // force chart remount on range change to avoid stale axes/smoothing artifacts
  const [mountKey, setMountKey] = useState(0);
  useEffect(() => { setRange("1M"); setMountKey(k => k + 1); }, [ticker]);

  // measure width -> sensible maxPoints
  const wrapRef = useRef(null);
  const [pxWidth, setPxWidth] = useState(400);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setPxWidth(Math.max(200, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ✅ New tails (literal ticks)
  // MAX uses a huge sentinel; backend clamps to available length
  const tailByRange = { "5D": 5, "1M": 30, "YTD": 365, "MAX": 1_000_000_000 };
  const tail = tailByRange[range] ?? 30;

  // ~2px/point; keep it sane. Also clamp to tail to avoid asking for more than we request.
  const baseMax = clamp(Math.floor(pxWidth / 2), 30, 800);
  const safeMaxPoints = Math.min(baseMax, tail);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-tail", ticker, tail, safeMaxPoints, mountKey],
    queryFn: () => fetchTail(ticker, { tail, maxPoints: safeMaxPoints }),
    enabled: !!ticker,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const points = useMemo(() => Array.isArray(data?.points) ? data.points : [], [data]);

  const labels = useMemo(() => {
    const t = data?.meta?.tail ?? points.length;
    const offset = Math.max(0, t - points.length);
    return points.map((_, i) => `t-${offset + i + 1}`);
  }, [points, data]);

  const net = points.length > 1 ? points.at(-1) - points[0] : 0;
  const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#9aa0a6";

  const yMin = points.length ? Math.min(...points) : 0;
  const yMax = points.length ? Math.max(...points) : 1;
  const yPad = Math.max((yMax - yMin) * 0.08, (yMax || 1) * 0.02);

  const chartData = {
    labels,
    datasets: [{
      label: `${ticker} Price`,
      data: points,
      borderColor: color,
      borderWidth: 2,
      pointRadius: 0,
      tension: compact ? 0.25 : 0.3,
      cubicInterpolationMode: "monotone",
      fill: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: compact
      ? {
          x: { display: false, grid: { display: false }, ticks: { display: false } },
          y: { display: false, grid: { display: false }, ticks: { display: false },
               min: yMin - yPad, max: yMax + yPad },
        }
      : {
          x: { ticks: { maxTicksLimit: 6 } },
          y: { min: yMin - yPad, max: yMax + yPad, ticks: { callback: v => `$${(+v).toFixed(2)}` } },
        },
    plugins: { legend: { display: false } },
  };

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        {["5D", "1M", "YTD", "MAX"].map((id) => (
          <button
            key={id}
            onClick={(e) => { e.stopPropagation(); setRange(id); setMountKey(k => k + 1); }}
            className={`interval-button ${id === range ? "active" : ""}`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div key={mountKey} style={{ height }}>
        {isLoading && <p style={{ opacity: 0.6 }}>Loading chart…</p>}
        {error && <p style={{ color: "tomato" }}>Chart error.</p>}
        {!isLoading && !error && points.length >= 2 && <Line data={chartData} options={options} />}
        {!isLoading && !error && points.length < 2 && <p style={{ opacity: 0.6 }}>No data.</p>}
      </div>
    </div>
  );
}
