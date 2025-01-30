import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts';

export default function CandleChart({ data }) {
    console.log(data);
    if (!data.length) {
        return <p>Loading candlestick data...</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <XAxis dataKey="date" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" />
                
                {/* Candlestick bars */}
                <Bar dataKey="high" fill="green" />
                <Bar dataKey="low" fill="red" />
                <Bar dataKey="open" fill="blue" />
                <Bar dataKey="close" fill="black" />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
