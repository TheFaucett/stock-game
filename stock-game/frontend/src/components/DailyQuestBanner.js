import React, { useMemo } from "react";
import "../styles/dailyQuestBanner.css";
import {
  evaluateQuests,
  hasClaimedReward,
  getTotalReward,
  claimReward
} from "../utils/QuestManager";
import { useTick } from "../TickProvider";

export default function DailyQuestBanner({ portfolio, stocks }) {
  const { tick } = useTick();

  console.log("📦 Rendering DailyQuestBanner");
  console.log("🧪 tick:", tick);
  console.log("🧪 portfolio:", portfolio);
  console.log("🧪 stocks:", stocks);

  if (typeof tick !== "number") {
    console.warn("❌ Tick not loaded");
    return <div>Tick not loaded.</div>;
  }

  if (
    !portfolio ||
    typeof portfolio !== "object" ||
    !Array.isArray(portfolio.transactions) ||
    typeof portfolio.ownedShares !== "object"
  ) {
    console.warn("❌ Invalid portfolio shape:", portfolio);
    return <div>Portfolio invalid.</div>;
  }

  if (!Array.isArray(stocks) || stocks.length === 0) {
    console.warn("❌ Invalid stocks array:", stocks);
    return <div>Stocks missing.</div>;
  }

  const quests = useMemo(() => {
    try {
      const result = evaluateQuests(tick, portfolio, stocks);
      console.log("✅ Evaluated Quests:", result);
      return result;
    } catch (e) {
      console.error("⚠️ Quest evaluation failed:", e);
      return [];
    }
  }, [tick, portfolio, stocks]);

  const totalReward = getTotalReward(quests);
  const claimed = hasClaimedReward(tick);

  if (!quests.length) {
    console.log("⚠️ No quests to show.");
    return <div>No quests available for this tick.</div>;
  }

  return (
    <div className="quest-banner" style={{ border: "2px dashed lime", padding: "1rem", marginTop: "1rem" }}>
      <h3 className="quest-banner-title">📋 Daily Quests</h3>
      <div className="quest-cards">
        {quests.map((q) => (
          <div key={q.id} className={`quest-card ${q.completed ? "completed" : ""}`}>
            <div className="quest-status">{q.completed ? "✅" : "⬜"}</div>
            <div className="quest-desc">{q.text}</div>
          </div>
        ))}

        <div className="quest-reward">
          {claimed ? (
            <div className="reward-claimed">🎉 Claimed +${totalReward}</div>
          ) : totalReward > 0 ? (
            <button className="claim-btn" onClick={() => {
              claimReward(tick);
              window.location.reload();
            }}>
              🎁 Claim ${totalReward}
            </button>
          ) : (
            <div className="no-reward">Complete quests to earn $</div>
          )}
        </div>
      </div>
    </div>
  );
}
