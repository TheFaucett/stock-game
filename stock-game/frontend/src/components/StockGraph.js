import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
function StockGraph({ ticker, history }) {
    const chartData = history.map((price, index) => ({
        day: `Day ${index + 1}`,
        price: parseFloat(price),
    }));

    return (
        console.log("IM HERE!"),
        <LineChart
            width={600}
            height={300}
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
            <XAxis dataKey="day" tick={{ fill: '#ffffff' }} />
            <YAxis tick={{ fill: '#ffffff' }} />
            <Tooltip contentStyle={{ backgroundColor: '#333', color: '#fff' }} />
            <Legend />
            <Line
                type="monotone"
                dataKey="price"
                stroke="#4da6ff"
                activeDot={{ r: 6 }}
            />
        </LineChart>
    );
}
export default StockGraph;