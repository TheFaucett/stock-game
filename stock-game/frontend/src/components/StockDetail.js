import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function StockDetail() {
    const { ticker } = useParams();
    const [stock, setStock] = useState(null);

    useEffect(() => {
        const fetchStockData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/stocks`);
                const stocks = await response.json();
                const selectedStock = stocks.find((s) => s.ticker === ticker);
                if (selectedStock) {
                    setStock(selectedStock);
                }
            } catch (error) {
                console.error('Error fetching stock data:', error);
            }
        };

        fetchStockData();
    }, [ticker]);

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
            <Link to="/">Back to Stock List</Link>
        </div>
    );
}
