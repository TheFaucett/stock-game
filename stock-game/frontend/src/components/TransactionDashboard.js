import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/transactionDashboard.css";

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
      .get(`http://localhost:5000/api/portfolio/${userId}`)
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
        const res = await fetch("http://localhost:5000/api/tick");
        const data = await res.json();
        setCurrentTick(data.tick);
      } catch (err) {
        setCurrentTick(null);
      }
    }
    fetchTick();
    // Optionally poll every 2s for live tick
    const interval = setInterval(fetchTick, 2000);
    return () => clearInterval(interval);
  }, []);

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
              {/* Optional: Show the current tick at top */}
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
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice()
                    .reverse()
                    .map(tx => (
                      <tr key={tx._id}>
                        <td>
                          {typeof tx.tickOpened === "number"
                            ? `#${tx.tickOpened}`
                            : "–"}
                        </td>
                        <td>{tx.type}</td>
                        <td>{tx.ticker}</td>
                        <td>{tx.shares}</td>
                        <td>${tx.price.toFixed(2)}</td>
                        <td>${tx.total.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
