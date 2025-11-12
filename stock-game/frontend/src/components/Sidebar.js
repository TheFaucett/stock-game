import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import StockGraph from "./StockGraph";
import PortfolioBalanceGraph from "./PortfolioBalanceGraph";
import "../styles/sidebar.css";
import { getOrCreateUserId } from "../userId";
import API_BASE_URL from "../apiConfig";

const USER_ID = getOrCreateUserId();

const fetchPortfolio = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/portfolio/${USER_ID}`);
  return data;
};

const fmtUsd = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

export default function Sidebar() {
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ["portfolio", USER_ID],
    queryFn: fetchPortfolio,
    refetchInterval: 30_000,
  });

  const [isOpen, setIsOpen] = useState(false);

  const positions = useMemo(() => {
    if (!portfolio?.ownedShares) return [];

    const txByTicker = new Map();
    for (const tx of portfolio.transactions || []) {
      if (!tx?.ticker) continue;
      if (!txByTicker.has(tx.ticker)) txByTicker.set(tx.ticker, []);
      txByTicker.get(tx.ticker).push(tx);
    }

    return Object.entries(portfolio.ownedShares)
      .filter(([, shares]) => shares > 0)
      .map(([ticker, shares]) => {
        const currentPrice =
          portfolio.currentPrices?.[ticker] ??
          portfolio.lastPrices?.[ticker] ??
          null;

        const txs = (txByTicker.get(ticker) || []).filter(
          (t) => t.type === "buy" || t.type === "sell"
        );
        const buyShares = txs
          .filter((t) => t.type === "buy")
          .reduce((s, t) => s + (t.shares || 0), 0);
        const buyCost = txs
          .filter((t) => t.type === "buy")
          .reduce((s, t) => s + (t.price || 0) * (t.shares || 0), 0);

        const avgCost = buyShares > 0 ? buyCost / buyShares : null;

        let pctChange = null;
        if (currentPrice != null && avgCost != null && avgCost > 0) {
          pctChange = ((currentPrice - avgCost) / avgCost) * 100;
        } else if (
          typeof portfolio.priceChanges?.[ticker] === "number" &&
          Number.isFinite(portfolio.priceChanges[ticker])
        ) {
          pctChange = portfolio.priceChanges[ticker];
        }

        const marketValue =
          currentPrice != null ? currentPrice * shares : null; // ← null means unknown

        return {
          ticker,
          shares,
          currentPrice,
          avgCost,
          pctChange,
          marketValue,
        };
      })
      .sort((a, b) => (b.marketValue ?? -1) - (a.marketValue ?? -1));
  }, [portfolio]);

  const { bestPerformer, worstPerformer, mostValuable } = useMemo(() => {
    if (!positions.length)
      return { bestPerformer: null, worstPerformer: null, mostValuable: null };

    const mostValuable = positions[0];
    const perf = positions.filter((p) => typeof p.pctChange === "number");

    const bestPerformer =
      perf.length > 0
        ? perf.reduce(
            (best, p) => (best == null || p.pctChange > best.pctChange ? p : best),
            null
          )
        : null;

    const worstPerformer =
      perf.length > 0
        ? perf.reduce(
            (worst, p) =>
              worst == null || p.pctChange < worst.pctChange ? p : worst,
            null
          )
        : null;

    return { bestPerformer, worstPerformer, mostValuable };
  }, [positions]);

  // Force line type for sidebar chart (no candle controls shown here)
  useEffect(() => {
    if (!mostValuable?.ticker) return;
    try { localStorage.setItem(`chartType:${mostValuable.ticker}`, "line"); } catch {}
  }, [mostValuable?.ticker]);

  return (
  <div className={`sidebar-container ${isOpen ? "open" : "closed"}`}>
    <button className="toggle-btn" onClick={() => setIsOpen((o) => !o)}>
      {isOpen ? "◀" : "▶"}
    </button>

    <aside className="sidebar">
      <h2>Your Portfolio</h2>
      {isLoading && <p>Loading portfolio...</p>}
      {error && <p>Error fetching portfolio.</p>}

      {/* 👇 Handle empty portfolio scenario */}
      {portfolio && positions.length === 0 ? (
        <div style={{ marginTop: "1rem", color: "#ccc", fontStyle: "italic" }}>
          <p>You don’t own any stocks yet.</p>
          <p>
            Visit the{" "}
            <a href="/market" style={{ color: "#93c5fd" }}>
              Market
            </a>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <>
          {/* ✅ Core Portfolio Summary */}
          <div className="card">
            <p>
              <strong>Balance:</strong> {fmtUsd(portfolio.balance)}
            </p>
            <p>
              <strong>Stocks Owned:</strong>
            </p>
            <ul>
              {positions.map((p) => (
                <li key={p.ticker}>
                  {p.ticker}: {p.shares} shares
                </li>
              ))}
            </ul>
          </div>

          {/* 📉 Portfolio Graph */}
          <h3>Portfolio History</h3>
          <PortfolioBalanceGraph size="small" />

          {/* 💰 Most Valuable */}
          <h3>Most Valuable Stock</h3>
          {mostValuable && (
            <div className="card">
              <p>
                {mostValuable.ticker}: {mostValuable.shares} shares · MV{" "}
                {mostValuable.marketValue == null
                  ? "—"
                  : fmtUsd(mostValuable.marketValue)}
              </p>
              <div className="chart-block">
                <StockGraph
                  ticker={mostValuable.ticker}
                  height={180}
                  showTypeToggle={false}
                  compact
                />
              </div>
            </div>
          )}

          {/* 🚀 Best Performer */}
          <h3>Best Performer</h3>
          {bestPerformer && (
            <div className="card">
              <p>
                <strong>{bestPerformer.ticker}</strong>
              </p>
              <p
                style={{
                  color: bestPerformer.pctChange >= 0 ? "limegreen" : "crimson",
                }}
              >
                {bestPerformer.pctChange.toFixed(2)}%
                {bestPerformer.avgCost != null &&
                  bestPerformer.currentPrice != null && (
                    <>
                      {" "}
                      (avg {fmtUsd(bestPerformer.avgCost)} →{" "}
                      {fmtUsd(bestPerformer.currentPrice)})
                    </>
                  )}
              </p>
            </div>
          )}

          {/* 📉 Worst Performer */}
          <h3>Biggest Loser</h3>
          {worstPerformer && (
            <div className="card">
              <p>
                <strong>{worstPerformer.ticker}</strong>
              </p>
              <p
                style={{
                  color: worstPerformer.pctChange >= 0 ? "limegreen" : "crimson",
                }}
              >
                {worstPerformer.pctChange.toFixed(2)}%
                {worstPerformer.avgCost != null &&
                  worstPerformer.currentPrice != null && (
                    <>
                      {" "}
                      (avg {fmtUsd(worstPerformer.avgCost)} →{" "}
                      {fmtUsd(worstPerformer.currentPrice)})
                    </>
                  )}
              </p>
            </div>
          )}

          {/* 🕓 Recent Positions Placeholder */}
          <h3>Recent Positions</h3>
          <div className="card">
            <p style={{ color: "#999" }}>Coming soon.</p>
          </div>
        </>
      )}
    </aside>
  </div>
  );
}
