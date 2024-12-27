import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function StockDetail() {
	const { ticker } = useParams(); // Get stock ticker from URL
	const [stock, setStock] = useState(null);
	const [balance, setBalance] = useState(0);

	useEffect(() => {
		fetch(`http://localhost:5000/api/stocks`)
			.then((response) => response.json())
			.then((stocks) => {
				const selectedStock = stocks.find((s) => s.ticker === ticker);
				setStock(selectedStock);
			});
	}, [ticker]);

	useEffect(() => {
		fetch('http://localhost:5000/api/balance')
			.then((response) => response.json())
			.then((data) => setBalance(data.balance));
	}, []);

	function handleTransaction(type, amount) {
		fetch('http://localhost:5000/api/balance', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ type, amount, ticker }),
		})
			.then((response) => response.json())
			.then((data) => setBalance(data.balance));
	}

	if (!stock) {
		return <p>Loading stock details...</p>;
	}

	return (
		<div>
			<h1>{stock.ticker} Details</h1>
			<p>Price: ${stock.price.toFixed(2)}</p>
			<p>Balance: ${balance.toFixed(2)}</p>
			<button
				onClick={() =>
					handleTransaction(
						'buy',
						parseInt(prompt(`Enter number of shares to buy for ${stock.ticker}:`))
					)
				}
			>
				Buy
			</button>
			<button
				onClick={() =>
					handleTransaction(
						'sell',
						parseInt(prompt(`Enter number of shares to sell for ${stock.ticker}:`))
					)
				}
			>
				Sell
			</button>
			<br />
			<Link to="/">Back to Stock List</Link>
		</div>
	);
}

export default StockDetail;
