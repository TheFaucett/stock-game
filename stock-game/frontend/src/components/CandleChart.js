// src/components/CandleChart.jsx
import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";

function buildCandles(history = [], bucket = 10, startTickBase = 1) {
  const data = [];
  for (let i = 0; i < history.length; i += bucket) {
    const slice = history.slice(i, i + bucket).map(Number).filter(Number.isFinite);
    if (slice.length < 2) continue;
    const open = slice[0];
    const close = slice[slice.length - 1];
    const high = Math.max(...slice);
    const low  = Math.min(...slice);
    const tickNumber = startTickBase + i + slice.length - 1; // label end of bucket
    data.push({ x: `Tick ${tickNumber}`, y: [open, high, low, close] });
  }
  return data;
}

export default function CandleChart({
  history = [],
  range = "1M",
  height = 150,
  startTickBase = 1,
}) {
  const containerRef = useRef(null);
  const [plotW, setPlotW] = useState(800);

  // measure container to adapt candle width
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(300, Math.floor(e.contentRect.width || 800));
      setPlotW(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { seriesData, bucketUsed } = useMemo(() => {
    // target ~6–8 px per candle
    const desiredPx = 7;
    const targetCandles = Math.max(60, Math.floor((plotW || 800) / desiredPx));
    const bucket = Math.max(1, Math.round(history.length / targetCandles));
    return {
      seriesData: buildCandles(history, bucket, startTickBase),
      bucketUsed: bucket,
    };
  }, [history, startTickBase, plotW]);

  const options = useMemo(() => ({
    chart: {
      type: "candlestick",
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: false },
      foreColor: "#aaa",
    },
    theme: { mode: "dark" },
    grid: {
      borderColor: "rgba(255,255,255,0.06)",
      padding: { left: 6, right: 6 },
    },
    xaxis: {
      type: "category",
      tickPlacement: "between",          // visually slims candles
      labels: { rotate: 0, style: { colors: "#9aa0a6", fontSize: "11px" } },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => `$${Number(v).toFixed(2)}`,
        style: { colors: "#9aa0a6" },
      },
      decimalsInFloat: 2,
    },
    plotOptions: {
      candlestick: {
        colors: { upward: "#22c55e", downward: "#ef4444" },
        wick: { useFillColor: true },
      },
    },
    stroke: { width: 1 },                // thin wicks/borders
    tooltip: {
      theme: "dark",
      x: { formatter: (val) => val },
      y: {
        formatter: (v, { seriesIndex, dataPointIndex, w }) => {
          const O = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
          const H = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
          const L = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
          const C = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
          return `O: $${O.toFixed(2)}  H: $${H.toFixed(2)}  L: $${L.toFixed(2)}  C: $${C.toFixed(2)}`;
        },
      },
    },
    // optional debug title to see chosen bucket
    // title: { text: `bucket=${bucketUsed}`, style: { color: '#666' } },
  }), [bucketUsed]);

  return (
    <div ref={containerRef} style={{ width: "100%", height }}>
      <ReactApexChart
        type="candlestick"
        series={[{ data: seriesData }]}
        options={options}
        height={height}
      />
    </div>
  );
}
