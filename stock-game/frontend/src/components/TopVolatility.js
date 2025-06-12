import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/topVolatility.css'; // FIXED casing

const fetchTopVolatility = async () => {
  const { data } = await axios.get('http://localhost:5000/api/featured-stocks/volatility');
  console.log("Volatility data:", data);

  return data.volatile || [];
};

export default function TopVolatility() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topVolatility'],
    queryFn: fetchTopVolatility,
    refetchInterval: 10_000
  });

  return (
    <div className="top-volatility-page">  {/* Add wrapper */}
      <div className="volatility-list">
        {Array.isArray(data) && data.length > 0 ? (
          data.map((stock) => (
            <Link
              key={stock._id}
              to={`/stock/${stock.ticker}`}
              className="volatility-card"
            >
              <h2>{stock.ticker}</h2>
              <p>📈 Volatility: {(stock.volatility * 100).toFixed(2)}%</p>
              <p>Price: ${stock.price.toFixed(2)}</p>
              <p>Change: {stock.change.toFixed(2)}%</p>
            </Link>
          ))
        ) : !isLoading && !error ? (
          <p>No data available.</p>
        ) : null}
      </div>
    </div>
  );
}
