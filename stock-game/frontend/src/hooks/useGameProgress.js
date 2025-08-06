import { useEffect, useState } from "react";
import { checkAchievements } from "../utils/checkAchievements";
import { useTick } from "../TickProvider";
import API_BASE_URL from "../apiConfig";
import { getOrCreateUserId } from "../userId";

export function useGameProgress() {
  const { tick } = useTick();
  const userId = getOrCreateUserId();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Fetch portfolio from backend
  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      setBalance(data.balance ?? 0);
      setTransactions(data.transactions ?? []);
      // Keep latest balance in localStorage for achievements
      localStorage.setItem("lastBalance", data.balance ?? 0);
    } catch (err) {
      console.error("❌ Error fetching portfolio in useGameProgress:", err);
    }
  };

  // Fetch when tick changes
  useEffect(() => {
    fetchPortfolio();
    checkAchievements("tick");
  }, [tick]);

  // Check trade-triggered achievements when transactions change
  useEffect(() => {
    if (transactions.length) {
      checkAchievements("trade");
    }
  }, [transactions]);
}
