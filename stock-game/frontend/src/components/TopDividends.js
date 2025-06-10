import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/topDividends.css';

export default function TopDividends() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topDividends'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:5000/api/featured-stocks/dividends');
      console.log('Dividends data:', data);
      return data;
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: false
  });

  return (
    <div className="featured-page">
      <h2>💸 Top Dividend Yield Stocks</h2>
      {isLoading && <p>Loading dividends data...</p>}
      {error && <p>Error loading dividends data.</p>}
      {data?.topYield?.length > 0 ? (
        data.topYield.map((stock, idx) => (
          <div key={idx} className="dividends-stock-card">
            <h3>{stock.ticker}</h3>
            <p>Dividend Yield: {(stock.dividendYield * 100).toFixed(2)}%</p>
            <p>Price: ${Number(stock.price).toFixed(2)}</p>
            <p>Change: {Number(stock.change).toFixed(2)}%</p>
          </div>
        ))
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
