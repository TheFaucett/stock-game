import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StockDetail from './components/StockDetail.js';

function App() {
	const [stocks, setStocks] = useState([]);
	const [balance, setBalance] = useState(0);

	function handleTransaction(type, amount, ticker) {
		fetch('http://localhost:5000/api/balance', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ type, amount, ticker }),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('New balance:', data.balance);
				setBalance(data.balance);
			})
			.catch((error) => console.error('Error updating balance:', error));
	}

	useEffect(() => {
		fetch('http://localhost:5000/api/balance')
			.then((response) => response.json())
			.then((data) => setBalance(data.balance))
			.catch((error) => console.error('Error fetching balance:', error));
	}, []);

	useEffect(() => {
		fetch('http://localhost:5000/api/stocks')
			.then((response) => response.json())
			.then((data) => setStocks(data))
			.catch((error) => console.error('Error fetching stocks:', error));
	}, []);

	const handleBuy = (ticker) => {
		const amount = prompt('Enter the number of shares to buy: ');
		if (amount) {
			handleTransaction('buy', parseInt(amount), ticker);
		}
	};

	const handleSell = (ticker) => {
		const amount = prompt('Enter the number of shares to sell: ');
		if (amount) {
			handleTransaction('sell', parseInt(amount), ticker);
		}
	};

	const StockList = () => (
		<div>
			<h1>Stock List</h1>
			<p>Balance: ${balance.toFixed(2)}</p>
			<table>
				<thead>
					<tr>
						<th>Ticker</th>
						<th>Price</th>
						<th>Change (%)</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{stocks.map((stock) => (
						<tr key={stock.ticker}>
							<td>
								<Link to={`/stock/${stock.ticker}`}>{stock.ticker}</Link>
							</td>
							<td>${stock.price.toFixed(2)}</td>
							<td
								style={{
									color: stock.change > 0 ? 'green' : 'red',
								}}
							>
								{stock.change}%
							</td>
							<td>
								<button onClick={() => handleBuy(stock.ticker)}>Buy</button>
								<button onClick={() => handleSell(stock.ticker)}>Sell</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	return (
		<BrowserRouter>
			<Routes>
				{/* Route for Stock List */}
				<Route path="/" element={<StockList />} />
				{/* Route for Stock Detail */}
				<Route path="/stock/:ticker" element={<StockDetail />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
