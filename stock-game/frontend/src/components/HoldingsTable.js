import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { getOrCreateUserId } from "../userId";
const USER_ID = getOrCreateUserId();
/**
 * Helper: Calculate average cost basis for a ticker from transactions
 */
function calcAvgCost(transactions, ticker) {
  let totalShares = 0, totalCost = 0;
  for (const t of transactions) {
    if (t.ticker !== ticker) continue;
    if (t.type === "buy") {
      totalShares += t.shares;
      totalCost += t.shares * t.price;
    }
    if (t.type === "sell") {
      totalShares -= t.shares;
      // Optionally, adjust totalCost (but simplest: leave as is)
    }
  }
  return totalShares > 0 ? totalCost / totalShares : 0;
}

const fetchPortfolio = async () => {
    const { data } = await axios.get(
        `${API_BASE_URL}/api/portfolio/${USER_ID}`
    )
    return data;
}
export default function HoldingsTable({ portfolio=fetchPortfolio() }) {
  const [stockData, setStockData] = useState({});
  const tickers = Object.keys(portfolio.ownedShares || {}).filter(
    ticker => portfolio.ownedShares[ticker] > 0
  );

  // Fetch info for all tickers in parallel, like StockDetail does for single stock
  useEffect(() => {
    let isMounted = true;
    async function fetchStocks() {
      // Fetch each ticker's info using the backend endpoint
      const entries = await Promise.all(
        tickers.map(async ticker => {
          const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
          if (!res.ok) return [ticker, null];
          const stock = await res.json();
          return [ticker, stock];
        })
      );
      if (isMounted) {
        setStockData(Object.fromEntries(entries));
      }
    }
    if (tickers.length) fetchStocks();
    return () => { isMounted = false };
  }, [tickers.join(",")]); // re-run if tickers change

  if (!tickers.length) return <p>No holdings yet.</p>;

  return (
    <div className="holdings-table-wrapper" style={{ marginTop: 24 }}>
      <h2>Your Holdings</h2>
      <table className="holdings-table" style={{ width: "100%", background: "#1e1e25", color: "#fff" }}>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Shares</th>
            <th>Avg Cost</th>
            <th>Price</th>
            <th>Value</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map(ticker => {
            const shares = portfolio.ownedShares[ticker];
            const stock = stockData[ticker];
            const avgCost = calcAvgCost(portfolio.transactions, ticker);
            const price = stock?.price ?? 0;
            const name = stock?.name ?? ticker;
            const value = price * shares;
            const pnl = (price - avgCost) * shares;

            return (
              <tr key={ticker}>
              <td>
                <Link
                to={`/stock/${ticker}`}
                className="holding-ticker-link"
                style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "underline" }}
                >
                {ticker}
                </Link>
              </td>
                <td>{name}</td>
                <td>{shares}</td>
                <td>${avgCost.toFixed(2)}</td>
                <td>${price.toFixed(2)}</td>
                <td>${value.toFixed(2)}</td>
                <td style={{ color: pnl >= 0 ? "limegreen" : "crimson" }}>
                  {pnl >= 0 ? "+" : ""}
                  ${pnl.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
