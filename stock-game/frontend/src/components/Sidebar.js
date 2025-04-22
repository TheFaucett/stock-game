import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import StockGraph from './StockGraph';
import "../styles/sidebar.css";

const fetchPortfolio = async () => {
  const { data } = await axios.get('http://localhost:5000/api/portfolio/67af822e5609849ac14d7942');
  return data;
};

const Sidebar = () => {
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    refetchInterval: 10000
  });

  const [isOpen, setIsOpen] = useState(false);

  const recentShortOutcomes = useMemo(() => {
    if (!portfolio?.transactions) return [];

    const shorts = [];
    const covers = [];
    const matched = [];

    // Reverse for newest first
    [...portfolio.transactions].reverse().forEach(tx => {
      if (tx.type === 'short') shorts.push(tx);
      else if (tx.type === 'cover') covers.push(tx);
    });

    // Track how many shares have been covered per ticker
    const coverLedger = {};

    for (const short of shorts) {
      const ticker = short.ticker;
      const coverPool = covers.filter(c => c.ticker === ticker && new Date(c.date) > new Date(short.date));
      const alreadyCovered = coverLedger[ticker] || 0;

      let matchedCover = null;
      let accumulated = 0;

      for (const cover of coverPool) {
        accumulated += cover.shares;
        if (accumulated >= short.shares + alreadyCovered) {
          matchedCover = cover;
          break;
        }
      }

      if (matchedCover) {
        const profit = (short.price - matchedCover.price) * short.shares;
        matched.push({ ...short, cover: matchedCover, profit: profit.toFixed(2), isOpen: false });
        coverLedger[ticker] = (coverLedger[ticker] || 0) + short.shares;
      } else {
        matched.push({ ...short, isOpen: true });
      }

      if (matched.length >= 3) break;
    }

    return matched;
  }, [portfolio]);

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
              return (
                <>
                  <p>{ticker}: {shares} shares</p>
                  <StockGraph ticker={ticker} />
                </>
              );
            })()}
          </div>
        ) : (
          <p>No stocks owned yet.</p>
        )}

        <h3>Recent Shorts</h3>
        <div className="card">
          {recentShortOutcomes.length === 0 ? (
            <p>No short activity yet.</p>
          ) : (
            <ul>
              {recentShortOutcomes.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.ticker}</strong> — {s.shares} shares<br />
                  Shorted at ${s.price.toFixed(2)} <br />
                  {s.isOpen ? (
                    <span style={{ color: 'orange' }}>Still open</span>
                  ) : (
                    <span style={{ color: s.profit >= 0 ? 'lightgreen' : 'salmon' }}>
                      {s.profit >= 0 ? `Profit: $${s.profit}` : `Loss: $${Math.abs(s.profit)}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
