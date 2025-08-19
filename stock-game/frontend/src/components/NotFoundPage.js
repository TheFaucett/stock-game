// src/components/NotFoundPage.js
import React from "react";
import { Link } from "react-router-dom";
import "../styles/notFound.css";

export default function NotFoundPage() {
  return (
    <div className="notfound-overlay">
      <div className="notfound-box">
        <h1 className="notfound-title falling-part delay-0">
          <span className="glitch">4</span>
          <span className="glitch">0</span>
          <span className="glitch">4</span>
        </h1>
        <p className="notfound-message falling-part delay-1">
          What you're looking for may be delisted… or maybe it never existed.
        </p>
        <div className="falling-part delay-2">
          <Link to="/" className="notfound-home-btn">🏠 Back to Home</Link>
        </div>
      </div>

      {/* Floating ghost tickers */}
      <div className="ticker-fragment">📉</div>
      <div className="ticker-fragment">💥</div>
      <div className="ticker-fragment">📉</div>
    </div>
  );
}
