import React from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// ✅ Fetch Heatmap Data
const fetchHeatmapData = async () => {
    const { data } = await axios.get("http://localhost:5000/api/stocks/heatmap");
    return data.heatmapData || [];
};

// ✅ Determine Color Based on Change %
const getColor = (change) => {
    if (!change || isNaN(change)) return "gray";
    return change > 0 ? `rgb(0, ${Math.min(255, 50 + change * 15)}, 0)` : `rgb(${Math.min(255, 50 - change * 15)}, 0, 0)`;
};

const Heatmap = ({ sector }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["heatmap", sector],
        queryFn: fetchHeatmapData,
        refetchInterval: 5000,  // 🔥 Auto-refresh every 5 seconds
        refetchOnWindowFocus: false,  // Prevent refetching when switching tabs
    });

    if (isLoading) return <p>Loading heatmap...</p>;
    if (error) return <p>Error loading data.</p>;

    return (
        <div className="heatmap-container">
            <h2>{sector ? `${sector} Stocks` : "Stock Heatmap"}</h2>
            <ResponsiveContainer width="100%" height={500}>
                <Treemap
                    width={800}
                    height={500}
                    data={data}
                    dataKey="value"
                    aspectRatio={3 / 2}
                    stroke="#fff"
                    content={({ x, y, width, height, name, change }) => (
                        <Link to={`/stock/${name}`} style={{ textDecoration: "none" }}>
                            <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
                                {/* ✅ Entire Box is Clickable */}
                                <rect width={width} height={height} fill={getColor(change)} stroke="#fff" />
                                {width > 50 && height > 20 && (
                                    <>
                                        <text x={10} y={20} fontSize={14} fontWeight="bold" fill="white">{name}</text>
                                        <text x={10} y={40} fontSize={12} fill="white">
                                            Change: {change?.toFixed(2)}%
                                        </text>
                                    </>
                                )}
                            </g>
                        </Link>
                    )}
                >
                    <Tooltip />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};

export default Heatmap;
