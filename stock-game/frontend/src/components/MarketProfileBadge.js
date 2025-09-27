import React from "react";
import ReactDOM from "react-dom";
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

  if (isLoading || error || !data) return null;

  const emoji = profileEmojiMap[data.name] || "❌";

  // Use a portal to render above everything else
  return ReactDOM.createPortal(
    <div className="market-badge-container">
      <div className="market-badge-emoji">{emoji}</div>
    </div>,
    document.body // or use a div like #market-badge-root
  );
}
