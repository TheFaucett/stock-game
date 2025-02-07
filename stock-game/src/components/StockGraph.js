import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function StockGraph({ ticker, data, currentPrice }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Update chartData incrementally, appending new data points
        setChartData((prevChartData) => {
            const updatedData = [...prevChartData];

            // Add new historical data points if they are not already in the chart
            data.forEach((price, index) => {
                const dayLabel = `Day ${index + 1}`;
                if (!updatedData.find((entry) => entry.day === dayLabel)) {
                    updatedData.push({ day: dayLabel, price });
                }
            });

            // Add the latest price if it's not already in the chart
            const latestDayLabel = `Day ${updatedData.length + 1}`;
            if (
                updatedData[updatedData.length - 1]?.price !== currentPrice &&
                !updatedData.find((entry) => entry.day === latestDayLabel)
            ) {
                updatedData.push({
                    day: latestDayLabel,
                    price: currentPrice,
                });
            }

            return updatedData;
        });
    }, [data, currentPrice]); // Only update when `data` or `currentPrice` changes

    return (
        <LineChart
            width={600}
            height={300}
            data={chartData}
            margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
            }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
            <XAxis dataKey="day" tick={{ fill: '#ffffff' }} />
            <YAxis tick={{ fill: '#ffffff' }} />
            <Tooltip
                contentStyle={{
                    backgroundColor: '#383838', // Tooltip background
                    color: '#ffffff', // Tooltip text
                    border: '1px solid #4a4a4a',
                }}
            />
            <Legend wrapperStyle={{ color: '#ffffff' }} />
            <Line
                type="monotone"
                dataKey="price"
                stroke="#4da6ff"
                activeDot={{ r: 8 }}
            />
        </LineChart>

    );
}

export default StockGraph;
