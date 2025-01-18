import React, { useState, useEffect } from 'react';

const MarketIndex = () => {
    const [indexValue, setIndexValue] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarketIndex = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/market-index');
                if (!response.ok) {
                    throw new Error('Failed to fetch market index data.');
                }
                const data = await response.json();
                setIndexValue(parseFloat(data.indexValue));
                setPerformance(parseFloat(data.performance));
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchMarketIndex();
    }, []);

    if (loading) {
        return <div>Loading market index...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
            <h2>Market Index</h2>
            <p>
                <strong>Index Value:</strong> {indexValue.toFixed(2)}
            </p>
            <p>
                <strong>Performance:</strong>{' '}
                <span style={{ color: performance >= 0 ? 'green' : 'red' }}>
                    {performance >= 0 ? '+' : ''}
                    {performance.toFixed(2)}%
                </span>
            </p>
        </div>
    );
};

export default MarketIndex;
