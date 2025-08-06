import React, { useEffect } from "react";
import { useTick } from "../TickProvider";
import API_BASE_URL from "../apiConfig";
import { getOrCreateUserId } from "../userId";
import { checkAchievements } from "./checkAchievements";

export function GameProgressProvider({ children }) {
  const { tick } = useTick();
  const userId = getOrCreateUserId();

  // Fetch portfolio and check achievements every tick
  useEffect(() => {
    async function fetchAndCheck() {
      try {
        console.log("I TRY");
        const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch portfolio");
        const portfolio = await res.json();
        checkAchievements(portfolio);
      } catch (err) {
        console.error("❌ Error fetching portfolio for achievements:", err);
      }
    }

    fetchAndCheck();
  }, [tick, userId]);

  return children;
}
