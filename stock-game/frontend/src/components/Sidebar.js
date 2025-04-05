import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import StockGraph from './StockGraph'; // ✅ Import the chart component
import "../styles/sidebar.css";

const fetchPortfolio = async () => {
  const { data } = await axios.get('http://localhost:5000/api/portfolio/67af822e5609849ac14d7942');
  return data;
};

const Sidebar = () => {
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio
  });

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '◀' : '▶'}
      </button>
      <aside className="sidebar">
        <h2>Your Portfolio</h2>
        {isLoading && <p>Loading portfolio...</p>}
        {error && <p>Error fetching portfolio.</p>}
        {portfolio && (
          <div className="card">
            <p><strong>Balance:</strong> ${portfolio.balance.toFixed(2)}</p>
            <p><strong>Stocks Owned:</strong></p>
            <ul>
              {Object.entries(portfolio.ownedShares).map(([ticker, shares]) => (
                <li key={ticker}>{ticker}: {shares} shares</li>
              ))}
            </ul>
          </div>
        )}
        
        <h3>Most Valuable Stock</h3>
        {portfolio?.ownedShares && Object.keys(portfolio.ownedShares).length > 0 ? (
          <div className="card">
            {(() => {
              const mostValuable = Object.entries(portfolio.ownedShares)
                .reduce((max, stock) => stock[1] > max[1] ? stock : max);
              const [ticker, shares] = mostValuable;
              console.log(ticker, shares);
              return (
                <>
                  <p>{ticker}: {shares} shares</p>
                  <StockGraph ticker={ticker} history={mostValuable.history} />
                </>
              );
            })()}
          </div>
        ) : (
          <p>No stocks owned yet.</p>
        )}
      </aside>
    </div>
  );
};

export default Sidebar;
