// src/components/Watchlist.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StockGraph from "./StockGraph";
import { getOrCreateUserId } from "../userId";
import "../styles/watchlist.css"; // Add your styles here
export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [stockData, setStockData] = useState({});
  const userId = getOrCreateUserId();

  // Fetch watchlist on mount
  useEffect(() => {
    async function fetchWatchlist() {
      const res = await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist`);
      const json = await res.json();
      setWatchlist(Array.isArray(json.watchlist) ? json.watchlist : []);
    }
    fetchWatchlist();
  }, [userId]);

  // Fetch data for each ticker in watchlist
  useEffect(() => {
    if (!watchlist.length) return;
    let active = true;
    Promise.all(
      watchlist.map(async ticker => {
        const res = await fetch(`http://localhost:5000/api/stocks/${ticker}`);
        if (!res.ok) return [ticker, null];
        const stock = await res.json();
        return [ticker, stock];
      })
    ).then(entries => {
      if (active) setStockData(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [watchlist.join(",")]);

  if (!watchlist.length) return <p>No stocks in your watchlist yet.</p>;

  return (
    <div className="watchlist">
      <h2 style={{ marginBottom: 16 }}>Watchlist</h2>
      <div className="watchlist-grid">
        {watchlist.map(ticker => {
          const stock = stockData[ticker];
          if (!stock) return (
            <div key={ticker} className="watchlist-card">
              <div>Loading {ticker}…</div>
            </div>
          );
          return (
            <div key={ticker} className="watchlist-card">
              <Link
                to={`/stock/${ticker}`}
                className="watchlist-ticker"
                style={{
                  fontWeight: 600,
                  fontSize: "1.1em",
                  color: "#93c5fd",
                  textDecoration: "underline"
                }}
              >
                {ticker}
              </Link>
              <div style={{ fontSize: "0.95em" }}>
                Price: <b>${stock.price.toFixed(2)}</b>
              </div>
              <div style={{ color: stock.change >= 0 ? "limegreen" : "crimson", fontWeight: 600 }}>
                {stock.change >= 0 ? "+" : ""}
                {stock.change?.toFixed(2)}%
              </div>
              {/* Mini StockGraph—set a small height */}
              <div style={{ marginTop: 8, height: 175 }}>
                <StockGraph ticker={ticker} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
