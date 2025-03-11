import React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "../styles/heatmap.css"; // Optional CSS

const fetchStockData = async () => {
    const { data } = await axios.get("http://localhost:5000/api/stocks/heatmap");
    return data.sectors;
};

const Heatmap = () => {
    const { data: sectors, isLoading, error } = useQuery({
        queryKey: ["heatmap"],
        queryFn: fetchStockData,
        refetchInterval: 30000 // Refresh data every 30 seconds
    });

    if (isLoading) return <p>Loading heatmap...</p>;
    if (error) return <p>Error loading data</p>;

    // Convert API data into Recharts format
    const formattedData = sectors.map(sector => ({
        name: sector.name,
        children: sector.stocks.map(stock => ({
            name: stock.ticker,
            size: stock.marketCap, // Determines rectangle size
            change: stock.change // Determines color
        }))
    }));

    return (
        <div className="heatmap-container">
            <h2>Stock Market Heatmap</h2>
            <ResponsiveContainer width="100%" height={500}>
                <Treemap
                    data={formattedData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                >
                    <Tooltip
                        content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const { name, change } = payload[0].payload;
                            return (
                                <div className="tooltip">
                                    <p><strong>{name}</strong></p>
                                    <p>Change: {change}%</p>
                                </div>
                            );
                        }}
                    />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};

export default Heatmap;
