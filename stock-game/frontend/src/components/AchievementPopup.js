import React, { useEffect } from "react";
import "../styles/achievementPopup.css";

export default function AchievementPopup({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000); // auto close (ms)
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!achievement) return null;

  return (
    <div className="achievement-popup">
      <div className="achievement-icon">🏆</div>
      <div className="achievement-text">
        <h2>Achievement Unlocked!</h2>
        <h3>{achievement.name}</h3>
        <p>{achievement.desc}</p>
      </div>
    </div>
  );
}
