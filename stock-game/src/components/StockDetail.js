import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';

export default function StockDetail() {
    const { ticker } = useParams(); // Get stock ticker from URL
    const [stock, setStock] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        const fetchStockData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks`);
                const stocks = await response.json();
                const selectedStock = stocks.find((s) => s.ticker === ticker);

                if (selectedStock) {
                    setStock(selectedStock);

                    setPriceHistory((prevHistory) => {
                        if (prevHistory.length === 0) {
                            // Initialize history if empty
                            const simulatedHistory = Array.from({ length: 30 }, (_, index) => ({
                                day: `Day ${index + 1}`,
                                price: (selectedStock.price + Math.random() * 10 - 5).toFixed(2),
                            }));
                            return simulatedHistory;
                        } else {
                            // Shift data to make room for the new price
                            const updatedHistory = prevHistory.slice(1); // Remove the first (oldest) entry
                            updatedHistory.push({
                                day: `Day ${prevHistory.length}`,
                                price: selectedStock.price.toFixed(2),
                            }); // Add the new price as the latest entry
                            return updatedHistory;
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching stock data:', error);
            }
        };

        // Fetch stock data initially and periodically
        fetchStockData();
        const interval = setInterval(fetchStockData, 5000); // Update every 5 seconds

        return () => clearInterval(interval); // Clean up interval on unmount
    }, [ticker]);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/balance');
                const data = await response.json();
                setBalance(data.balance);
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        };

        fetchBalance();
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
            .then((data) => setBalance(data.balance))
            .catch((error) => console.error('Error processing transaction:', error));
    }

    if (!stock) {
        return <p>Loading stock details...</p>;
    }

    return (
        <div>
            <h1>{stock.ticker} Details</h1>
            <p>Price: ${stock.price.toFixed(2)}</p>
            <p>Change: {stock.change}%</p>
            <p>P/E Ratio: {stock.peRatio ? stock.peRatio.toFixed(2) : 'N/A'}</p>
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
            <div>
                {/* Include Stock Graph */}
                <StockGraph ticker={ticker} data={priceHistory.map(({ price }) => price)} currentPrice={stock.price} />
            </div>
            <Link to="/">Back to Stock List</Link>
        </div>
    );
}
