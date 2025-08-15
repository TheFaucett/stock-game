// src/components/MarketIndexGraph.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import API_BASE_URL from "../apiConfig";
import { useTick } from "../TickProvider";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const dbg = (...a) => { /* toggle for debugging */ /* console.debug("[MarketIndexGraph]", ...a); */ };

/** Fetch tail window of index with LTTB thinning on server (if needed) */
async function fetchIndexTail({ tail, maxPoints }) {
  const url = `${API_BASE_URL}/api/market-data/index?tail=${tail}&maxPoints=${maxPoints}`;
  dbg("GET", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Index fetch failed (${res.status})`);
  const json = await res.json(); // { points, meta }
  dbg("resp.meta", json.meta, "points.len", Array.isArray(json.points) ? json.points.length : 0);
  return json;
}

/** Try to infer x and y keys if points are objects */
function normalizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) return { xs: [], ys: [] };

  const first = points[0];

  // number[] case
  if (typeof first === "number") {
    const ys = points.map(Number);
    const xs = ys.map((_, i) => i); // simple ordinal x
    return { xs, ys };
  }

  // object[] case – infer keys
  const lowerKeys = Object.keys(first).reduce((acc, k) => {
    acc[k.toLowerCase()] = k;
    return acc;
  }, {});

  const xCand = ["timestamp", "ts", "time", "t", "tick", "x"];
  const yCand = ["value", "v", "index", "price", "y"];

  const xKey = xCand.find(k => lowerKeys[k]) ? lowerKeys[xCand.find(k => lowerKeys[k])] : null;
  const yKey = yCand.find(k => lowerKeys[k]) ? lowerKeys[yCand.find(k => lowerKeys[k])] : null;

  // Fallbacks: if no keys found, just ordinal x + first numeric field for y
  if (!yKey) {
    const numericK = Object.keys(first).find(k => Number.isFinite(+first[k]));
    const ys = points.map(p => Number(p[numericK]));
    const xs = ys.map((_, i) => i);
    dbg("⚠️ could not infer yKey; used first numeric key", numericK);
    return { xs, ys };
  }

  const ys = points.map(p => Number(p[yKey]));
  const xs = xKey ? points.map(p => p[xKey]) : ys.map((_, i) => i);
  return { xs, ys };
}

/**
 * MarketIndexGraph
 * - Compact, dynamic tail chart using the backend tail route.
 * - 1 tick ≈ 1 day ranges: 5D=5, 1M=30, YTD=365, MAX=huge (server clamps).
 */
export default function MarketIndexGraph({ height = 220, compact = false }) {
  const [range, setRange] = useState("1M");
  const wrapRef = useRef(null);
  const [pxWidth, setPxWidth] = useState(500);
  const { tick } = useTick(); // refresh as your game ticks

  // Watch width to size maxPoints sanely
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(240, Math.floor(entry.contentRect.width));
      setPxWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ✅ 1-tick-per-day tails
  const tailByRange = { "5D": 5, "1M": 30, "YTD": 365, "MAX": 1_000_000_000 };
  const tail = tailByRange[range] ?? 30;

  // ~2 px/point looks clean; clamp AND cap to tail so we never ask > tail
  const baseMax = clamp(Math.floor(pxWidth / 2), 30, 1200);
  const maxPoints = Math.min(baseMax, tail);

  const { data, isLoading, error } = useQuery({
    queryKey: ["market-index-tail", range, tail, maxPoints, tick],
    queryFn: () => fetchIndexTail({ tail, maxPoints }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const { xs, ys } = useMemo(() => normalizePoints(data?.points || []), [data]);

  // Labels: simple and cheap (no time adapter)
  const looksLikeTime = xs.length && typeof xs[0] === "number" && xs[0] > 10_000_000;
  const labels = useMemo(() => {
    if (xs.length === 0) return [];
    if (looksLikeTime) {
      // coarse time-ish labels (no adapter required)
      const step = Math.max(1, Math.ceil(xs.length / 6));
      return xs.map((v, i) => (i % step === 0 ? `t=${v}` : ""));
    }
    // ordinal fallback
    return xs.map((_, i) => `Tick ${i + 1}`);
  }, [xs, looksLikeTime]);

  // Y padding so it doesn’t look cramped
  const yMin = ys.length ? Math.min(...ys) : 0;
  const yMax = ys.length ? Math.max(...ys) : 1;
  const yPad = Math.max((yMax - yMin) * 0.08, (yMax || 1) * 0.02);

  const net = ys.length > 1 ? ys.at(-1) - ys[0] : 0;
  const color = net < 0 ? "#e53935" : net > 0 ? "#43a047" : "#9aa0a6";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Market Index",
        data: ys,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        tension: compact ? 0.25 : 0.3,
        cubicInterpolationMode: "monotone",
        fill: false,
      },
    ],
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
          y: { min: yMin - yPad, max: yMax + yPad, ticks: { callback: (v) => v.toFixed(2) } },
        },
    plugins: { legend: { display: false } },
  };

  dbg("render", { range, tail, maxPoints, width: pxWidth, pts: ys.length, isLoading, error: !!error });

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      {/* Range controls (reuse your .interval-button styles if present) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        {["5D", "1M", "YTD", "MAX"].map((id) => (
          <button
            key={id}
            onClick={() => setRange(id)}
            className={`interval-button ${id === range ? "active" : ""}`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {isLoading && <p style={{ opacity: 0.6 }}>Loading index…</p>}
        {error && <p style={{ color: "tomato" }}>Index error.</p>}
        {!isLoading && !error && ys.length >= 2 && <Line data={chartData} options={options} />}
        {!isLoading && !error && ys.length < 2 && <p style={{ opacity: 0.6 }}>No data.</p>}
      </div>
    </div>
  );
}
