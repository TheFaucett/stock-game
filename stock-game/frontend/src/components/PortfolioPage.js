import React, { useEffect, useState } from "react";
import HoldingsTable from "./HoldingsTable";
import PortfolioBalanceGraph from "./PortfolioBalanceGraph";
import TransactionDashboard from "./TransactionDashboard";
import { getOrCreateUserId } from "../userId";
import "../styles/portfolio.css";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      const userId = getOrCreateUserId();
      const res = await fetch(`http://localhost:5000/api/portfolio/${userId}`);
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

      {/* Holdings Table */}
      <HoldingsTable portfolio={portfolio} />

      {/* Transaction Dashboard */}
      <div className="transaction-dashboard-wrapper">
        <TransactionDashboard transactions={portfolio.transactions} />
      </div>

      {/* Recent Transactions */}
      <div className="portfolio-transactions">
        <h2>Recent Transactions</h2>
        <ul>
          {(portfolio.transactions || []).slice(-20).reverse().map((t, idx) => (
            <li key={idx}>
              [{new Date(t.date).toLocaleString()}] <b>{t.type}</b> {t.shares} <b>{t.ticker}</b> @ ${t.price.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
