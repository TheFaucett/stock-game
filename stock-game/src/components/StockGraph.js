import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function StockGraph({ ticker, data }) {
	const chartData = data.map((price, index) => ({
		day: `Day ${index + 1}`,
		price: price,
	}));

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
