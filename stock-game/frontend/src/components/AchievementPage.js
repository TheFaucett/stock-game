import React from "react";
import { ACHIEVEMENTS } from "../utils/achievements";
import { getUnlockedAchievements } from "../utils/achievementsStorage";
import "../styles/achievementsPage.css";

export default function AchievementsPage() {
  const unlocked = getUnlockedAchievements();

  return (
    <div className="achievements-page">
      <h1>🏆 Achievements</h1>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`achievement-card ${isUnlocked ? "unlocked" : "locked"}`}
            >
              <div className="achievement-icon">
                {isUnlocked ? "✅" : "❌"}
              </div>
              <div className="achievement-details">
                <h2>{a.name}</h2>
                <p>{a.desc}</p>
                {isUnlocked && <div className="bling">✨✨✨</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
