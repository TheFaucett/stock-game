import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/topStocks.css'; // Use your unified style
import API_BASE_URL from '../apiConfig';
export default function TopDividends() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topDividends'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/api/featured-stocks/dividends`);
      // fallback to .topYield or .movers or []
      return data.topYield || data.movers || [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="top-stocks-page">
      <h2>💸 Top Dividend Yield Stocks</h2>
      {isLoading && <p>Loading dividends data...</p>}
      {error && <p>Error loading dividends data.</p>}
      {Array.isArray(data) && data.length > 0 ? (
        data.map((stock, idx) => (
          <div key={stock._id || idx} className="top-stock-card">
            <Link to={`/stock/${stock.ticker}`} className="top-stock-link">
              <h3>{stock.ticker}</h3>
              <p>Dividend Yield: <b>{(stock.dividendYield * 100).toFixed(2)}%</b></p>
              <p>Price: ${Number(stock.price).toFixed(2)}</p>
              {console.log(stock)}
              <p>Change: {Number(stock.change).toFixed(2)}%</p>
            </Link>
          </div>
        ))
      ) : !isLoading && !error ? (
        <p>No data available</p>
      ) : null}
    </div>
  );
}