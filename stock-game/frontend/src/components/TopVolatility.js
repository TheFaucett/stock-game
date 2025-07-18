// src/components/TopVolatility.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/topStocks.css';
import API_BASE_URL from '../apiConfig';
// 1️⃣ Accept endpoint, title, formatValue as PROPS (so it matches TopStocksPage)
export default function TopVolatility({ endpoint = 'volatility', title = 'Most Volatile Stocks' }) {
  // 2️⃣ Unified fetch logic (endpoint is prop)
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/featured-stocks/${endpoint}`);
      // Ensure we always return an array, even if field name changes
      return res.data.movers || res.data.volatile || [];
    },
    refetchOnWindowFocus: false,
  });

  // 3️⃣ Standard render logic
  return (
    <div className="top-stocks-page">
      <h2>{title}</h2>
      {isLoading && <p>Loading data...</p>}
      {error && <p>Error loading data.</p>}

      {/* 4️⃣ Cards look identical except for their "details" */}
      {Array.isArray(data) && data.length > 0 ? (
        data.map((stock, idx) => (
          <div key={stock._id || idx} className="top-stock-card">
            <Link to={`/stock/${stock.ticker}`} className="top-stock-link">
              <h3>{stock.ticker}</h3>
              {/* 👇 Custom display for volatility */}
              <p>📈 Volatility: {(stock.volatility * 100).toFixed(2)}%</p>
              <p>Price: ${stock.price?.toFixed(2)}</p>
              <p>Change: {stock.change?.toFixed(2)}%</p>
            </Link>
          </div>
        ))
      ) : !isLoading && !error ? (
        <p>No data available.</p>
      ) : null}
    </div>
  );
}
