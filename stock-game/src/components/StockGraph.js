import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function StockGraph({ ticker, data, currentPrice }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Create chart data from historical prices
        const updatedData = data.map((price, index) => ({
            day: `Day ${index + 1}`,
            price,
        }));

        // Add the latest price if it's not already in the data
        if (updatedData[updatedData.length - 1]?.price !== currentPrice) {
            updatedData.push({
                day: `Day ${updatedData.length + 1}`,
                price: currentPrice,
            });
        }

        setChartData(updatedData);
    }, [data, currentPrice]); // Re-run whenever `data` or `currentPrice` changes

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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
    );
}

export default StockGraph;
