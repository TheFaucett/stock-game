// GlobalDataContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import API_BASE_URL from "../apiConfig";
import { getOrCreateUserId } from "../userId";
import { checkAchievements } from "./utils/checkAchievements";
const DataContext = createContext();
export function GlobalDataProvider({ children }) {
  const userId = getOrCreateUserId();

  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);

  const refreshPortfolio = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
    const data = await res.json();
    setPortfolio(data);
    setTransactions(data.transactions || []);
    checkAchievements(data)
  }, [userId]);

  const refreshStocks = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/stocks`);
    const data = await res.json();
    setStocks(data);
  }, []);

  return (
    <DataContext.Provider value={{
      portfolio, transactions, stocks,
      refreshPortfolio, refreshStocks
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useGlobalData() {
  return useContext(DataContext);
}
