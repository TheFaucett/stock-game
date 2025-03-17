import React from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// ✅ Fetch Sector Data
const fetchSectorData = async () => {
    const { data } = await axios.get("http://localhost:5000/api/stocks/sector-heatmap");
    console.log("API Response:", data);
    return data.sectors || [];
};

// ✅ Determine Color Based on Change %
const getColor = (change) => {
    if (!change || isNaN(change)) return "gray";
    return change > 0
        ? `rgb(0, ${Math.min(255, 50 + change * 15)}, 0)` // Green for gains
        : `rgb(${Math.min(255, 50 - change * 15)}, 0, 0)`; // Red for losses
};

// ✅ Format Market Cap Display
const formatMarketCap = (value) => {
    if (!value || isNaN(value)) return "$0";
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`; // Trillions
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`; // Billions
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`; // Millions
    return `$${value.toFixed(2)}`;
};

const SectorHeatmap = ({ onSectorClick }) => {
    const { data: sectors, isLoading, error } = useQuery({
        queryKey: ["sectors"],
        queryFn: fetchSectorData
    });

    if (isLoading) return <p>Loading sectors...</p>;
    if (error) return <p>Error loading sector data.</p>;
    const formattedData = sectors.map((sector, index) => {
        console.log("Sector Object:", sector); // ✅ Debugging log for each sector

        return {
            name: sector.name || sector._id || `Sector ${index}`, // 🔥 Ensure we use the correct name field
            value: sector.totalMarketCap || 1,  // Market Cap as value
            change: sector.avgChange || 0,  // % Change
            key: sector._id || sector.name || `sector-${index}`, // Unique key
        };
    });


    return (
        <div className="sector-heatmap-container">
            <h2>📊 Sector Heatmap</h2>
            <ResponsiveContainer width="100%" height={450}>
                <Treemap
                    width={800}
                    height={450}
                    data={formattedData}
                    dataKey="value"
                    aspectRatio={2}
                    stroke="#fff"
                    content={({ x, y, width, height, name, value, change }) => (
                        <g transform={`translate(${x},${y})`}>
                            <rect
                                width={width}
                                height={height}
                                style={{
                                    fill: getColor(change),
                                    stroke: "#fff"
                                }}
                                onClick={() => onSectorClick(name)}
                            />
                            {width > 70 && height > 30 && (
                                <>
                                    <text x={10} y={20} fill="white" fontSize={14} fontWeight="bold">
                                        {name} {/* ✅ Fix: Display correct sector name */}
                                    </text>
                                    <text x={10} y={40} fill="white" fontSize={12}>
                                        {formatMarketCap(value)}
                                    </text>
                                    <text x={10} y={60} fill="white" fontSize={12}>
                                        Change: {parseFloat(change).toFixed(2)}%
                                    </text>
                                </>
                            )}
                        </g>
                    )}
                >
                    <Tooltip
                        content={({ payload }) => {
                            if (payload && payload.length) {
                                return (
                                    <div style={{ background: "black", padding: "8px", color: "white", borderRadius: "5px" }}>
                                        <strong>{payload[0].payload.name}</strong>
                                        <p>Market Cap: {formatMarketCap(payload[0].payload.value)}</p>
                                        <p>Change: {parseFloat(payload[0].payload.change).toFixed(2)}%</p>
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
};

export default SectorHeatmap;
