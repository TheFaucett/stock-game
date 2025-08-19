// src/components/UpcomingDividendsPanel.js
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../apiConfig";
import { useTick } from "../TickProvider";
import "../styles/upcomingDividends.css";

export default function UpcomingDividendsPanel({ ownedShares }) {
  const { tick } = useTick();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownedShares) return;

    const fetchStocks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stocks`);
        const data = await res.json();
        setStocks(data);
      } catch (err) {
        console.error("Failed to fetch stock data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [ownedShares]);

  if (loading || !stocks.length || typeof tick !== "number") return null;

  const ticksIntoCycle = tick % 90;
  const ticksRemaining = 90 - ticksIntoCycle;

  const dividends = stocks
    .filter((s) => ownedShares[s.ticker])
    .map((s) => {
      const shares = ownedShares[s.ticker];
      const annualYield = s.dividendYield ?? 0;
      const quarterlyYield = annualYield / 4;
      const perShare = s.price * quarterlyYield;
      const total = perShare * shares;

      return {
        ticker: s.ticker,
        shares,
        amount: total.toFixed(2)
      };
    })
    .filter((d) => parseFloat(d.amount) > 0)
    .sort((a, b) => b.amount - a.amount);

  if (!dividends.length) return null;

  return (
    <div className={`dividends-panel ${ticksRemaining <= 5 ? "soon" : ""}`}>
      <h2>📤 Upcoming Dividends</h2>
      <p className="dividends-subtext">
        {ticksRemaining <= 5
          ? `Expected in ${ticksRemaining === 1 ? "1 tick" : `${ticksRemaining} ticks`}`
          : `Next payout in ${ticksRemaining} ticks`}
      </p>
      <ul>
        {dividends.map(({ ticker, shares, amount }) => (
          <li key={ticker}>
            <strong>{ticker}</strong> — ${amount}{" "}
            <span className="subinfo">({shares} shares)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
