// GlobalDataContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import API_BASE_URL from "./apiConfig";
import { getOrCreateUserId } from "./userId";

const DataContext = createContext();

export function GlobalDataProvider({ children }) {
  const userId = getOrCreateUserId();

  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);

  // Refresh portfolio and transactions
  const refreshPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      setPortfolio(data);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
    }
  }, [userId]);

  // Refresh stock list
  const refreshStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stocks`);
      if (!res.ok) throw new Error("Failed to fetch stocks");
      const data = await res.json();
      setStocks(data || []);
    } catch (err) {
      console.error("Error fetching stocks:", err);
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        portfolio,
        transactions,
        stocks,
        refreshPortfolio,
        refreshStocks,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useGlobalData() {
  return useContext(DataContext);
}
