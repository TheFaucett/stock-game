import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, } from 'react-router-dom';
import StockDetail from './components/StockDetail';

function App() {
	const [stocks, setStocks] = useState([]);
	const [balance, setBalance] = useState(0);
	const [currentNews, setCurrentNews] = useState(null);

	// Fetch balance
	useEffect(() => {
		fetch('http://localhost:5000/api/balance')
			.then((response) => response.json())
			.then((data) => setBalance(data.balance))
			.catch((error) => console.error('Error fetching balance:', error));
	}, []);


    // Fetch stocks periodically
	useEffect(() => {
		const fetchStocks = () => {
			fetch('http://localhost:5000/api/stocks')
				.then((response) => response.json())
				.then((data) => setStocks(data))
				.catch((error) => console.error('Error fetching stocks:', error));
		};

		fetchStocks(); // Initial fetch
		const interval = setInterval(fetchStocks, 10000); // Fetch every 5 seconds

		return () => clearInterval(interval); // Cleanup interval on unmount
	}, []);



    useEffect(() => {
        const interval = setInterval(() => {
            fetch('http://localhost:5000/api/current-news')
                .then((response) => response.json())
                .then((data) => {
                    console.log(data);
                    setCurrentNews(data);
                })
                .catch((error) => console.error('Error fetching news:', error));
        }, 10000); // Fetch every 10 seconds

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);


	// Handle buy and sell transactions
	function handleTransaction(type, amount, ticker) {
		fetch('http://localhost:5000/api/balance', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ type, amount, ticker }),
		})
			.then((response) => response.json())
			.then((data) => setBalance(data.balance))
			.catch((error) => console.error('Error updating balance:', error));
	}

	// Stock List Component
	const StockList = () => (
		<div>
			<h1>Stock List</h1>
			<p>Balance: ${balance.toFixed(2)}</p>
			{currentNews && (
				<div style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
					<h3>Current News:</h3>
					<p>
						<strong>{currentNews.ticker}</strong>: {currentNews.description}
					</p>
				</div>
			)}
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
								<Link
									to={`/stock/${stock.ticker}`}
									style={{
										color: stock.change > 0 ? 'green' : 'red',
										textDecoration: 'none',
									}}
								>
									{stock.ticker}
								</Link>
							</td>
							<td>${stock.price.toFixed(2)}</td>
							<td
								style={{
									color: stock.change > 0 ? 'green' : 'red',
								}}
							>
								{stock.change > 0 ? '+' : ''}
								{stock.change.toFixed(2)}%
							</td>
							<td>
								<button
									onClick={() => {
										const amount = prompt('Enter the number of shares to buy: ');
										if (amount) handleTransaction('buy', parseInt(amount), stock.ticker);
									}}
								>
									Buy
								</button>
								<button
									onClick={() => {
										const amount = prompt('Enter the number of shares to sell: ');
										if (amount) handleTransaction('sell', parseInt(amount), stock.ticker);
									}}
								>
									Sell
								</button>
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
				<Route path="/" element={<StockList />} />
				<Route path="/stock/:ticker" element={<StockDetail />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
