import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, Line, CartesianGrid } from 'recharts';

function CandleChart({ data }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Ensure all `x` values are converted to valid Date objects
        const processedData = data.map((point) => ({
            ...point,
            x: point.x instanceof Date ? point.x : new Date(point.x), // Convert `x` to Date if it's not already
        }));

        setChartData((prevChartData) => {
            const updatedData = [...prevChartData];

            // Add new data points only if they don't already exist in the chart
            processedData.forEach((newDataPoint) => {
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
    }, [data]);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="x"
                    tickFormatter={(tick) => {
                        if (tick instanceof Date) {
                            return tick.toLocaleDateString();
                        }
                        const parsedDate = new Date(tick);
                        return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
                    }}
                />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) => {
                        const parsedDate = new Date(label);
                        return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
                    }}
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
