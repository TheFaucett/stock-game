import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';
import CandleChart from './CandleChart'; // Component for candlestick charts

export default function StockDetail() {
    const { ticker } = useParams();
    const [stock, setStock] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [candleData, setCandleData] = useState([]);
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

        // Poll for stock data every 5 seconds
        const intervalId = setInterval(fetchStockData, 1000);
        fetchStockData(); // Initial fetch

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [ticker]);

    useEffect(() => {
        // Function to fetch user balance
        const fetchBalance = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/balance');
                const data = await response.json();
                setBalance(data.balance);
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        };

        fetchBalance(); // Initial fetch
    }, []);

    useEffect(() => {
        // Function to fetch candlestick data
        const fetchCandleData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks/candlestick`);
                const data = await response.json();

                // Filter candlestick data for the specific ticker
                const stockCandleData = data.filter((s) => s.ticker === ticker);
                if (stockCandleData.length > 0) {
                    const formattedData = stockCandleData.map((item) => ({
                        x: new Date(item.date), // Convert date to JavaScript Date object
                        open: item.open,
                        high: item.high,
                        low: item.low,
                        close: item.close,
                    }));
                    setCandleData(formattedData);
                } else {
                    console.warn(`No candlestick data found for ticker: ${ticker}`);
                    setCandleData([]);
                }
            } catch (error) {
                console.error('Error fetching candlestick data:', error);
            }
        };

        // Poll for candlestick data every 5 seconds
        const intervalId = setInterval(fetchCandleData, 5000);
        fetchCandleData(); // Initial fetch

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [ticker]);

    // Function to handle buy/sell transactions
    function handleTransaction(type, amount) {
        fetch('http://localhost:5000/api/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, amount, ticker }),
        })
            .then((response) => response.json())
            .then((data) => setBalance(data.balance))
            .catch((error) => console.error('Error processing transaction:', error));
    }

    // Render fallback for when stock data is unavailable
    if (!stock) {
        return (
            <div>
                <h1>Stock Not Found</h1>
                <p>The stock ticker "{ticker}" could not be found.</p>
                <Link to="/">Back to Stock List</Link>
            </div>
        );
    }

    // Render the component
    return (
        <div>
            <h1>{stock.ticker} Details</h1>
            <p>Price: ${stock.price.toFixed(2)}</p>
            <p>Change: {stock.change}%</p>
            <p>
                P/E Ratio: {typeof stock.peRatio === 'number' ? stock.peRatio.toFixed(2) : 'N/A'}
            </p>
            <p>Balance: ${balance.toFixed(2)}</p>
            <button onClick={() => handleTransaction('buy', parseInt(prompt(`Enter shares to buy:`)))}>Buy</button>
            <button onClick={() => handleTransaction('sell', parseInt(prompt(`Enter shares to sell:`)))}>Sell</button>
            <br />

            {/* Toggle Button */}
            <button onClick={() => setShowCandlestick(!showCandlestick)}>
                {showCandlestick ? 'Show Line Chart' : 'Show Candlestick Chart'}
            </button>

            {/* Chart Display */}
            <div>
                {showCandlestick ? (
                    <CandleChart data={candleData} />
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
