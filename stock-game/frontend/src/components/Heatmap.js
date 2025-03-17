import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Treemap, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Fetch heatmap data from backend
const fetchHeatmapData = async () => {
    const { data } = await axios.get("http://localhost:5000/api/stocks/heatmap");
    return data.heatmapData;
};

// Function to determine color based on stock price change
const getColor = (change) => {
    if (change > 0) return `rgb(0, ${Math.min(255, 50 + change * 10)}, 0)`; // Green for gains
    if (change < 0) return `rgb(${Math.min(255, 50 - change * 10)}, 0, 0)`; // Red for losses
    return "gray"; // Neutral color for no change
};

const Heatmap = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["heatmap"],
        queryFn: fetchHeatmapData
    });

    const [selectedSector, setSelectedSector] = useState(null);

    if (isLoading) return <p>Loading heatmap...</p>;
    if (error) return <p>Error loading data.</p>;

    return (
        <div className="heatmap-container">
            {/* ✅ Sector-Level Heatmap */}
            {!selectedSector && (
                <>
                    <h2>Sector Heatmap</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <Treemap
                            width={800}
                            height={400}
                            data={data}
                            dataKey="value"
                            aspectRatio={2}
                            stroke="#fff"
                            fill="#ffa500"
                            onClick={(entry) => {
                                if (entry.children) setSelectedSector(entry); // Selects a sector
                            }}
                        >
                            {/* Dynamically color sectors */}
                            {data.map((sector, index) => (
                                <Cell key={`sector-${index}`} fill={getColor(sector.change)} />
                            ))}
                            <Tooltip
                                content={({ payload }) => {
                                    if (payload && payload.length) {
                                        return (
                                            <div style={{ background: "black", padding: "5px", color: "white" }}>
                                                <strong>{payload[0].payload.name}</strong>
                                                <p>Market Cap: ${Math.round(payload[0].payload.value / 1e9)}B</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                </>
            )}

            {/* ✅ Stock-Level Heatmap with Color Coding */}
            {selectedSector && (
                <>
                    <button className="back-btn" onClick={() => setSelectedSector(null)}>🔙 Back to Sectors</button>
                    <h2>{selectedSector.name} Stocks</h2>

                    <ResponsiveContainer width="100%" height={500}>
                        <Treemap
                            width={800}
                            height={500}
                            data={selectedSector.children.map((stock, index) => ({
                                name: stock.name || `Stock ${index}`,
                                value: stock.marketCap || 0,
                                change: stock.change || 0,
                                key: stock.id || stock.name || `stock-${index}` // 🔥 Unique key
                            }))}
                            dataKey="value"
                            aspectRatio={3 / 2}
                            stroke="#fff"
                            fill={(entry) => getColor(entry.change)}
                        >
                            <Tooltip
                                content={({ payload }) => {
                                    if (payload && payload.length) {
                                        return (
                                            <div style={{ background: "black", padding: "5px", color: "white" }}>
                                                <strong>{payload[0].payload.name}</strong>
                                                <p>Market Cap: ${Math.round(payload[0].payload.value / 1e6)}M</p>
                                                <p>Change: {payload[0].payload.change}%</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                </>
            )}

        </div>
    );
};

export default Heatmap;
