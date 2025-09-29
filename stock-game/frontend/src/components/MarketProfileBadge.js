import React from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMarketProfile } from "../hooks/useMarketProfile";
import "../styles/marketBadge.css";

// Map profiles to emoji
const profileEmojiMap = {
  default: "💼",
  communist: "🧱",
  crisis: "📉",
  bubble: "🫧",
  wildwest: "🤠",
};

export default function MarketBadge() {
  const { data, isLoading, error } = useMarketProfile();
  const navigate = useNavigate();

  if (isLoading || error || !data) return null;

  const emoji = profileEmojiMap[data.name] || "❌";

  const handleClick = () => {
    navigate("/settings");
  };

  return ReactDOM.createPortal(
    <div className="market-badge-container">
      <button
        className="market-badge-button"
        onClick={handleClick}
        title="Switch market mode"
      >
        {emoji}
      </button>
    </div>,
    document.body
  );
}
