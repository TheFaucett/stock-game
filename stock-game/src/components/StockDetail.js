import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';
import CandleChart from './CandleChart';

export default function StockDetail({ watchlist, addToWatchlist, ownedShares = {}, setOwnedShares }) {
    const { ticker } = useParams();
    const [stock, setStock] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [balance, setBalance] = useState(0);
    const [showCandlestick, setShowCandlestick] = useState(false);

    useEffect(() => {
        const fetchStockData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks`);
                const stocks = await response.json();
                const selectedStock = stocks.find((s) => s.ticker === ticker);
                if (selectedStock) {
                    setStock(selectedStock);
                    const simulatedHistory = Array.from({ length: 30 }, (_, index) => ({
                        day: `Day ${index + 1}`,
                        price: (selectedStock.price + Math.random() * 10 - 5).toFixed(2),
                    }));
                    setPriceHistory(simulatedHistory);
                }
            } catch (error) {
                console.error('Error fetching stock data:', error);
            }
        };

        fetchStockData();
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

    const handleAddToWatchlist = () => {
        if (!watchlist.includes(ticker)) {
            addToWatchlist(ticker);
        } else {
            alert(`${ticker} is already in your watchlist.`);
        }
    };

    const handleTransaction = async (type, amount) => {
        if (!amount || amount <= 0) {
            alert('Please enter a valid number of shares.');
            return;
        }

        // Ensure ownedShares is not undefined and check for sufficient shares before selling
        if (type === 'sell') {
            const owned = ownedShares?.[ticker] || 0; // Use optional chaining and default value
            if (owned < amount) {
                alert(`You do not own enough shares of ${ticker} to sell.`);
                return;
            }
        }

        try {
            const response = await fetch('http://localhost:5000/api/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, amount, ticker }),
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Transaction failed: ${error.error}`);
                return;
            }

            const data = await response.json();
            setBalance(data.balance);

            // Update owned shares after the transaction
            setOwnedShares((prevOwnedShares) => {
                const updatedShares = { ...prevOwnedShares };
                if (type === 'buy') {
                    updatedShares[ticker] = (updatedShares[ticker] || 0) + amount;
                } else if (type === 'sell') {
                    updatedShares[ticker] -= amount;
                    if (updatedShares[ticker] <= 0) {
                        delete updatedShares[ticker]; // Remove stock entry if shares are zero
                    }
                }
                return updatedShares;
            });

            alert(`${type === 'buy' ? 'Bought' : 'Sold'} ${amount} shares of ${ticker}.`);
        } catch (error) {
            console.error('Error processing transaction:', error);
        }
    };

    if (!stock) {
        return (
            <div>
                <h1>Stock Not Found</h1>
                <p>The stock ticker "{ticker}" could not be found.</p>
                <Link to="/">Back to Stock List</Link>
            </div>
        );
    }

    return (
        <div>
            <h1>{stock.ticker} Details</h1>
            <p>Price: ${stock.price.toFixed(2)}</p>
            <p>Change: {stock.change}%</p>
            <p>P/E Ratio: {typeof stock.peRatio === 'number' ? stock.peRatio.toFixed(2) : 'N/A'}</p>
            <p>Balance: ${balance.toFixed(2)}</p>
            <button onClick={handleAddToWatchlist}>Add to Watchlist</button>
            <br />
            {/* Buy and Sell Buttons */}
            <button onClick={() => handleTransaction('buy', parseInt(prompt('Enter shares to buy:')))}>Buy</button>
            <button onClick={() => handleTransaction('sell', parseInt(prompt('Enter shares to sell:')))}>Sell</button>
            <br />
            <button onClick={() => setShowCandlestick(!showCandlestick)}>
                {showCandlestick ? 'Show Line Chart' : 'Show Candlestick Chart'}
            </button>
            <div>
                {showCandlestick ? (
                    <CandleChart data={priceHistory} />
                ) : (
                    <StockGraph
                        ticker={ticker}
                        data={priceHistory.map(({ price }) => price)}
                        currentPrice={stock.price}
                    />
                )}
            </div>
            <Link to="/">Back to Stock List</Link>
        </div>
    );
}
