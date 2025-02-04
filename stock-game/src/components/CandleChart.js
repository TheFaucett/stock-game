import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, Line, CartesianGrid } from 'recharts';

function CandleChart({ data }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Incrementally update the candlestick chart data
        setChartData((prevChartData) => {
            const updatedData = [...prevChartData];

            // Add new data points only if they don't already exist in the chart
            data.forEach((newDataPoint) => {
                const exists = updatedData.some(
                    (existingDataPoint) =>
                        existingDataPoint.x.getTime() === newDataPoint.x.getTime()
                );
                if (!exists) {
                    updatedData.push(newDataPoint);
                }
            });

            return updatedData;
        });
    }, [data]); // Run whenever `data` changes

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="x"
                    tickFormatter={(tick) => tick.toLocaleDateString()} // Format the date on the X-axis
                />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) => label.toLocaleDateString()}
                />
                <Bar dataKey="low" fill="#ff0000" />
                <Bar dataKey="high" fill="#00ff00" />
                <Line type="monotone" dataKey="open" stroke="#ff7300" />
                <Line type="monotone" dataKey="close" stroke="#387908" />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

export default CandleChart;
