import React from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTick } from "../TickProvider"; // 👈 Import useTick
import API_BASE_URL from "../apiConfig";
const fetchSectorData = async () => {
    const { data } = await axios.get(`${API_BASE_URL}/api/stocks/sector-heatmap`);
    return data.sectors || [];
};

const getColor = (change) => {
    if (!change || isNaN(change)) return "gray";
    return change > 0
        ? `rgb(0, ${Math.min(255, 50 + change * 15)}, 0)`
        : `rgb(${Math.min(255, 50 - change * 15)}, 0, 0)`;
};

const formatMarketCap = (value) => {
    if (!value || isNaN(value)) return "$0";
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
};

const SectorHeatmap = ({ onSectorClick }) => {
    const { tick } = useTick(); // 👈 Use tick from provider

    // 👇 Add tick to queryKey so it refetches every tick
    const { data: sectors, isLoading, error } = useQuery({
        queryKey: ["sectors", tick], // React-query will refetch on every tick
        queryFn: fetchSectorData
    });

    if (isLoading) return <p>Loading sectors...</p>;
    if (error) return <p>Error loading sector data.</p>;
    const formattedData = sectors.map((sector, index) => ({
        name: sector.name || sector._id || `Sector ${index}`,
        value: sector.totalMarketCap || 1,
        change: sector.avgChange || 0,
        key: sector._id || sector.name || `sector-${index}`,
    }));

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
                                    <text x={10} y={20} fill="white" fontSize={14} letterSpacing="0.09rem">
                                        {name}
                                    </text>
                                    <text x={10} y={40} fill="white" fontSize={12} letterSpacing="0.09rem">
                                        {formatMarketCap(value)}
                                    </text>
                                    <text x={10} y={60} fill="white" fontSize={12} letterSpacing="0.09rem">
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