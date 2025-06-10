import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/topStocks.css';

export default function TopStocksPage({ endpoint, title, formatValue }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/featured-stocks/${endpoint}`);
      return res.data.movers;
    },
    refetchOnWindowFocus: false,
  });

  return (
    <div className="top-stocks-page">
      <h2>{title}</h2>

      {isLoading && <p>Loading data...</p>}
      {error && <p>Error loading data.</p>}

      {data?.map((stock, idx) => (
        <div key={idx} className="top-stock-card">
          <Link to={`/stock/${stock.ticker}`} className="top-stock-link">
            <h3>{stock.ticker}</h3>
            <p>{formatValue(stock)}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}
