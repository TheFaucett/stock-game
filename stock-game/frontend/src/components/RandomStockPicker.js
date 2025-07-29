import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaDice } from "react-icons/fa"; // Install react-icons if needed
import "../styles/randomStockPicker.css"; // Import your styles
import API_BASE_URL from "../apiConfig"; // Adjust the import path as needed


export default function RandomStockPicker() {
  const [randomStock, setRandomStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pickRandomStock() {
    setLoading(true);
    setError("");
    setRandomStock(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/stocks`);
      if (!res.ok) throw new Error("Could not fetch stock list.");
      const stocks = await res.json();
      if (!Array.isArray(stocks) || stocks.length === 0)
        throw new Error("No stocks found.");
      const rand = stocks[Math.floor(Math.random() * stocks.length)];
      setRandomStock(rand);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="random-stock-picker-app-card">
      <div className="rsp-header">
        <FaDice size={22} style={{ marginRight: 6, color: "#60a5fa" }} />
        <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "0.5px" }}>Random Stock Picker</span>
      </div>
      <button
        className="stock-btn rsp-btn"
        onClick={pickRandomStock}
        disabled={loading}
        style={{ margin: "16px 0 10px 0" }}
      >
        {loading ? "Picking..." : "🎲 Pick a Random Stock"}
      </button>
      {error && <div className="rsp-error">{error}</div>}
      {randomStock && (
        <div key={randomStock.ticker} className="rsp-result animate-pop">
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#60a5fa" }}>
            <Link to={`/stock/${randomStock.ticker}`} style={{ textDecoration: "none", color: "#60a5fa" }}>
              {randomStock.ticker}
            </Link>
            <span style={{ color: "#eee", fontWeight: 400 }}> &ndash; {randomStock.name || ""}</span>
          </div>
          <div style={{ fontSize: "1.08rem", marginTop: 4 }}>
            Price: <b style={{ color: "#99f6e4" }}>${randomStock.price?.toFixed(2) ?? "N/A"}</b>
          </div>
          <Link to={`/stock/${randomStock.ticker}`}>
            <button className="stock-btn rsp-link-btn">
              Go to Stock
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}