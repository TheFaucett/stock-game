// src/components/TopMarketCapStocks.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/topStocks.css'; // Use your unified style
import API_BASE_URL from '../apiConfig';
export default function TopMarketCapStocks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topMarketCap'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/featured-stocks/marketcap`);
      // Support both {topCap: [...]} and just [...]

      return res.data.topCap || res.data.movers || [];
    },
    refetchOnWindowFocus: false,
    refetchInterval: 30000
  });

  return (
    <div className="top-stocks-page">
      <h2>🏦 Top Market Cap Stocks</h2>
      {isLoading && <p>Loading top market cap stocks...</p>}
      {error && <p>Error fetching market cap stocks.</p>}
      {console.log(data)}
      {Array.isArray(data) && data.length > 0 ? (
        data.map((stock, idx) => (
          <div key={stock._id || idx} className="top-stock-card">
            <Link to={`/stock/${stock.ticker}`} className="top-stock-link">
              <h3>{stock.ticker}</h3>
              <p>
                Market Cap: <b>${(stock.marketCap / 1e9).toFixed(2)} B</b>
              </p>
              <p>Price: ${stock.price?.toFixed(2)}</p>
              <p>Change: {stock.change?.toFixed(2)}%</p>
            </Link>
          </div>
        ))
      ) : !isLoading && !error ? (
        <p>No data available</p>
      ) : null}
    </div>
  );
}