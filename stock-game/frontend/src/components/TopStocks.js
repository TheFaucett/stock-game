// src/components/TopStocksPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/topStocks.css';
import API_BASE_URL from '../apiConfig';
// 🟢 Accept endpoint, title, and an optional formatValue function
export default function TopStocksPage({ endpoint = 'movers', title = 'Top Movers', formatValue }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/featured-stocks/${endpoint}`);
      return res.data.movers || res.data.topCap || res.data.topYield || [];
    },
    refetchOnWindowFocus: false,
  });

  return (
    <div className="top-stocks-page">
      <h2>{title}</h2>

      {isLoading && <p>Loading data...</p>}
      {error && <p>Error loading data.</p>}

      {Array.isArray(data) && data.length > 0 ? (
        data.map((stock, idx) => (
          <div key={stock._id || idx} className="top-stock-card">
            <Link to={`/stock/${stock.ticker}`} className="top-stock-link">
              <h3>{stock.ticker}</h3>
              {/* 🟢 Show all the info you want! */}
              <p>Price: ${Number(stock.price).toFixed(2)}</p>
              {/* If formatValue is passed, show that (for flexibility) */}
              {formatValue ? (
                <p>{formatValue(stock)}</p>
              ) : (
                <>
                  <p>
                    Change: {typeof stock.change === 'number'
                      ? stock.change.toFixed(2) + '%'
                      : 'N/A'}
                  </p>
                  {stock.marketCap !== undefined && (
                    <p>Market Cap: ${(stock.marketCap / 1e9).toFixed(2)}B</p>
                  )}
                  {stock.sector && <p>Sector: {stock.sector}</p>}
                </>
              )}
            </Link>
          </div>
        ))
      ) : !isLoading && !error ? (
        <p>No data available.</p>
      ) : null}
    </div>
  );
}