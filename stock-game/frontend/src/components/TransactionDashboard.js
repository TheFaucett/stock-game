import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/transactionDashboard.css";
import API_BASE_URL from "../apiConfig";

export default function TransactionDashboard({ userId }) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTick, setCurrentTick] = useState(null);

  // Fetch transactions
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/portfolio/${userId}`)
      .then(res => {
        setTransactions(res.data.transactions || []);
        setLoading(false);
      })
      .catch(e => {
        setError("Could not fetch transaction history.");
        setLoading(false);
      });
  }, [userId]);

  // Fetch current tick (for reference, optional)
  useEffect(() => {
    async function fetchTick() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tick`);
        const data = await res.json();
        setCurrentTick(data.tick);
      } catch (err) {
        setCurrentTick(null);
      }
    }
    fetchTick();
    const interval = setInterval(fetchTick, 2000);
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case "buy": return "🟢 Buy";
      case "sell": return "🔴 Sell";
      case "call": return "📈 Call";
      case "put": return "📉 Put";
      case "short": return "🏴 Short";
      case "cover": return "↩ Cover";
      default: return type;
    }
  };

  return (
    <div className="transaction-dashboard-collapsible">
      <button
        className="transaction-toggle-btn"
        onClick={() => setOpen(o => !o)}
      >
        {open ? "▼ Hide" : "▶ Show"} Transaction History
      </button>
      {open && (
        <div className="transactions-container">
          {loading ? (
            <div className="loading">Loading…</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="empty">No transactions yet.</div>
          ) : (
            <>
              <div style={{ fontSize: "0.95em", color: "#bbb", marginBottom: 4 }}>
                {currentTick !== null ? `Current Tick: ${currentTick}` : ""}
              </div>
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Tick</th>
                    <th>Type</th>
                    <th>Ticker</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>P/L</th>
                    <th>Break-even</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice()
                    .reverse()
                    .map(tx => {
                      const plValue =
                        tx.realizedPL != null
                          ? tx.realizedPL
                          : tx.unrealizedPL != null
                            ? tx.unrealizedPL
                            : null;
                      const plColor =
                        plValue > 0 ? "limegreen" : plValue < 0 ? "red" : "inherit";

                      return (
                        <tr key={tx._id}>
                          <td>
                            {typeof tx.tickOpened === "number"
                              ? `#${tx.tickOpened}`
                              : "–"}
                          </td>
                          <td>{getTypeIcon(tx.type)}</td>
                          <td>{tx.ticker}</td>
                          <td>{tx.shares}</td>
                          <td>${tx.price.toFixed(2)}</td>
                          <td>${tx.total.toFixed(2)}</td>

                          {/* P/L column */}
                          <td style={{ color: plColor }}>
                            {plValue != null
                              ? `$${plValue.toFixed(2)}`
                              : "—"}
                            {tx.percentChange != null && (
                              <div style={{ fontSize: "0.8em" }}>
                                ({tx.percentChange.toFixed(2)}%)
                              </div>
                            )}
                          </td>

                          {/* Break-even */}
                          <td>
                            {tx.breakEven
                              ? <span title={`Break-even price: $${tx.breakEven.toFixed(2)}`}>
                                  ${tx.breakEven.toFixed(2)}
                                </span>
                              : "—"}
                          </td>

                          {/* Expiry countdown */}
                          <td>
                            {tx.expiryTick && currentTick != null
                              ? `${tx.expiryTick - currentTick} ticks`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
