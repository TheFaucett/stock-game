import React, { useMemo } from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Fetch Heatmap Data
async function fetchHeatmapData() {
  const { data } = await axios.get("http://localhost:5000/api/stocks/heatmap");
  return data.heatmapData || [];
}

// Determine color based on % change
function getColor(change) {
  if (change == null || isNaN(change)) return "gray";
  // positive → green, negative → red
  if (change > 0) {
    const g = Math.min(255, 50 + change * 15);
    return `rgb(0, ${g}, 0)`;
  } else {
    const r = Math.min(255, 50 - change * 15);
    return `rgb(${r}, 0, 0)`;
  }
}

// Format market cap for Tooltip
function formatMarketCap(value) {
  if (value == null || isNaN(value)) return "$0";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
}

export default function Heatmap({ sector }) {
  // Always destructure data to at least an empty array
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["heatmap", sector],
    queryFn: fetchHeatmapData,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  // Derive the top 150 by descending “value” (market cap)
  const top150 = useMemo(() => {
    // Copy the array so we don’t mutate the original
    const arr = Array.isArray(data) ? [...data] : [];
    // Sort descending
    arr.sort((a, b) => (b.value || 0) - (a.value || 0));
    // Keep only first 150
    return arr.slice(0, 150);
  }, [data]);

  if (isLoading) return <p>Loading heatmap...</p>;
  if (error) return <p>Error loading data.</p>;

  return (
    <div className="heatmap-container">
      <h2>{sector ? `${sector} Stocks` : "Stock Heatmap"}</h2>
      <ResponsiveContainer width="100%" height={500}>
        <Treemap
          width={800}
          height={500}
          data={top150}
          dataKey="value"
          aspectRatio={3 / 2}
          stroke="#fff"
          content={({ x, y, width, height, name, change }) => (
            <Link to={`/stock/${name}`} style={{ textDecoration: "none" }}>
              <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
                <rect width={width} height={height} fill={getColor(change)} stroke="#fff" />
                {width > 50 && height > 20 && (
                  <>
                    <text
                      x={10}
                      y={20}
                      fontSize={14}
                      fontWeight="bold"
                      fill="white"
                    >
                      {name}
                    </text>
                    <text x={10} y={40} fontSize={12} fill="white">
                      Change: {change != null ? change.toFixed(2) : "0.00"}%
                    </text>
                  </>
                )}
              </g>
            </Link>
          )}
        >
          <Tooltip
            content={({ payload }) => {
              if (payload && payload.length > 0) {
                const stock = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "black",
                      padding: "8px",
                      color: "white",
                      borderRadius: "5px",
                    }}
                  >
                    <strong>{stock.name}</strong>
                    <p>Market Cap: {formatMarketCap(stock.value)}</p>
                    <p>Change: {parseFloat(stock.change).toFixed(2)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
