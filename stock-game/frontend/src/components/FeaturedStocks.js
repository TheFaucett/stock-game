import React, { useEffect, useState } from 'react';

const FeaturedStocks = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/stocks/featured');
                if (!res.ok) throw new Error('Failed to fetch featured stocks');
                const data = await res.json();
                setStocks(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFeatured();
    }, []);

    if (loading) return <p>Loading featured stocks...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>🌟 Featured Stocks</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {stocks.map((stock) => (
                    <li key={stock._id} style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                        <strong>{stock.ticker}</strong> — ${stock.price.toFixed(2)} <br />
                        Change: {stock.change}% | EPS: {stock.eps} | Volatility: {stock.volatility}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FeaturedStocks;
