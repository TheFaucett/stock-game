import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
// Use className so you can also assign .random-stock-picker-app-card directly if you wish
export default function TickerSearch({ className = "" }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState(false);

  // Fetch list of tickers once
  const { data: tickers, isLoading } = useQuery({
    queryKey: ["all-tickers"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/api/stocks`);
      return data.map(s => s.ticker);
    },
    staleTime: 60_000,
  });

  // Auto-complete filter
  const matches = (tickers || [])
    .filter(
      t =>
        t.toLowerCase().startsWith(input.toLowerCase()) &&
        input.trim().length > 0
    )
    .slice(0, 6);

  function handleSelect(ticker) {
    setInput("");
    setFocus(false);
    navigate(`/stock/${ticker.toUpperCase()}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (input && tickers?.includes(input.toUpperCase())) {
      handleSelect(input.toUpperCase());
    }
  }

  return (
    <div
      className={`random-stock-picker-app-card ${className}`}
      style={{
        // Use the same styles as your .random-stock-picker-app-card CSS!
        background: "#232345",
        borderRadius: "14px",
        boxShadow: "0 2px 16px #0004",
        padding: "1.4rem 1.8rem 1.5rem 1.5rem",
        maxWidth: "350px",
        marginBottom: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        position: "relative",
        minWidth: "260px",
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <label style={{
          color: "#a4a6d4",
          fontWeight: 600,
          fontSize: "1.08rem",
          letterSpacing: "0.01em",
          marginBottom: "0.7rem",
          display: "block",
        }}>
          Search by ticker:
        </label>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 100)}
            autoComplete="off"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px 14px",
              fontSize: "1.07rem",
              borderRadius: "7px",
              border: "1.4px solid #414179",
              outline: "none",
              background: "#181828",
              color: "#fff",
              fontWeight: 500,
              transition: "border 0.15s",
              marginRight: "0.7rem",
              boxShadow: "0 1px 4px 0 rgba(20,20,40,0.04)",
            }}
          />
          <button
            type="submit"
            style={{
              background: "linear-gradient(90deg, #60a5fa, #6366f1)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              padding: "10px 18px",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "background 0.16s, transform 0.11s",
              boxShadow: "0 1px 6px #0002",
            }}
            disabled={isLoading}
          >
            Search
          </button>
        </div>
      </form>
      {focus && matches.length > 0 && (
        <ul
          style={{
            position: "absolute",
            left: "1.5rem",
            right: "1.8rem",
            top: "4.9rem",
            background: "#232345",
            border: "1.2px solid #414179",
            borderRadius: "9px",
            boxShadow: "0 4px 16px 0 #23234566",
            zIndex: 1002,
            margin: 0,
            marginTop: "0.22rem",
            padding: 0,
            listStyle: "none",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {matches.map(t => (
            <li
              key={t}
              onMouseDown={() => handleSelect(t)}
              style={{
                padding: "11px 15px",
                cursor: "pointer",
                fontWeight: 500,
                color: "#d6dbff",
                fontSize: "1.01rem",
                borderRadius: "7px",
                margin: "2px 0",
                transition: "background 0.14s",
                background: "none",
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background = "#313159")
              }
              onMouseLeave={e =>
                (e.currentTarget.style.background = "none")
              }
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
