// src/components/TopMarketCapStocks.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/topMarketCap.css'; // you can create this later

export default function TopMarketCapStocks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topMarketCap'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/featured-stocks/marketcap');
      console.log('MarketCap data:', res.data);
      return res.data;
    },
    refetchInterval: 10000 // optional, refresh every 10s
  });

  if (isLoading) return <p>Loading top market cap stocks...</p>;
  if (error) return <p>Error fetching market cap stocks.</p>;

  return (
    <div className="marketcap-stocks-container">
      <h2>🏦 Top Market Cap Stocks</h2>
      {data?.topCap?.length > 0 ? (
        data.topCap.map((stock, idx) => (
          <div key={idx} className="marketcap-stock-card">
            <h3>{stock.ticker}</h3>
            <p>Market Cap: ${(stock.marketCap / 1e9).toFixed(2)} B</p>
            <p>Price: ${stock.price.toFixed(2)}</p>
            <p>Change: {stock.change.toFixed(2)}%</p>
          </div>
        ))
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
