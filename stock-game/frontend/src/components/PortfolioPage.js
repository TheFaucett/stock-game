import React, { useEffect, useState } from "react";
import HoldingsTable from "./HoldingsTable";
import PortfolioBalanceGraph from "./PortfolioBalanceGraph";
import TransactionDashboard from "./TransactionDashboard";
import Watchlist from "./Watchlist";
import { getOrCreateUserId } from "../userId";
import "../styles/portfolio.css";
import API_BASE_URL from "../apiConfig";
export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const userId = getOrCreateUserId();
      const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
      if (!res.ok) {
        setPortfolio(null);
      } else {
        setPortfolio(await res.json());
      }
      setLoading(false);
    };
    fetchPortfolio();
  }, []);

  if (loading) return <div className="portfolio-page"><p>Loading your portfolio...</p></div>;
  if (!portfolio) return <div className="portfolio-page"><p>No portfolio found.</p></div>;

  return (
    <div className="portfolio-page">
      {/* Portfolio Balance Graph */}
      <div className="portfolio-graph-wrapper">
        <PortfolioBalanceGraph size="large"/>
      </div>
      
      <div className="portfolio-summary">
        <h1>Your Portfolio</h1>
        <div className="balance">
          <span>💰 Balance:</span>
          <strong>${portfolio.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <HoldingsTable portfolio={portfolio} />
      <div style={{ marginTop: 0 }} />
      <Watchlist />

      <div className="transaction-dashboard-wrapper">
        <TransactionDashboard transactions={portfolio.transactions} />
      </div>

      {/* Recent Transactions */}
      <div className="portfolio-transactions">
        <h2>Recent Transactions</h2>
        <ul>
          {(portfolio.transactions || []).slice(-20).reverse().map((t, idx) => (
            <li key={idx}>
              [{typeof t.tickOpened === "number" ? `Tick #${t.tickOpened}` : "–"}]{" "}
              <b>{t.type}</b> {t.shares} <b>{t.ticker}</b> @ ${t.price.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}