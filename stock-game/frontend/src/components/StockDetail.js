import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';

export default function StockDetail() {
    const { ticker } = useParams();
    const [stock, setStock] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchStock = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks`);
                const stocks = await response.json();
                const selected = stocks.find(s => s.ticker === ticker);
                if (selected) setStock(selected);
            } catch (error) {
                console.error('Error fetching stock:', error);
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks/${ticker}/history`);
                const data = await response.json();
                if (data.history) setHistory(data.history);
            } catch (error) {
                console.error('Error fetching history:', error);
            }
        };

        fetchStock();
        fetchHistory();
    }, [ticker]);

    if (!stock) {
        return (
            <div>
                <h2>Stock Not Found</h2>
                <p>{ticker} does not exist.</p>
                <Link to="/">← Back</Link>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>{stock.ticker}</h1>
            <p>Price: ${stock.price.toFixed(2)}</p>
            <p>Change: {stock.change}%</p>
            <p>EPS: {stock.eps}</p>
            <p>Market Cap: ${(stock.price * stock.outstandingShares / 1e9).toFixed(2)}B</p>

            {history.length > 0 && (
                <>
                    <h3>Price History</h3>
                    <StockGraph ticker={ticker} history={history} />
                </>
            )}

            <Link to="/">← Back</Link>
        </div>
    );
}
