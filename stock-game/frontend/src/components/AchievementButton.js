import React from "react";
import { Link } from "react-router-dom";
import "../styles/global.css";
export default function AchievementFAB() {
  const hasNew = false; // Or logic to detect new unlocks

  return (
    <Link to="/achievements" className="fab-button fab-achievements">
      🏅
      {hasNew && <span className="fab-badge">!</span>}
    </Link>
  );
}
