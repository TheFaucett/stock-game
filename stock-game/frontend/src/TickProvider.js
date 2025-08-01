// TickProvider.js
import React, { createContext, useContext, useEffect, useState } from "react";
import API_BASE_URL from "./apiConfig";

const TickContext = createContext();

export function TickProvider({ children }) {
  const [tick, setTick] = useState(null);

  useEffect(() => {
    let lastTick = null;

    async function fetchTick() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tick`);
        const data = await res.json();
        if (typeof data.tick === "number" && data.tick !== lastTick) {
          setTick(data.tick);
          lastTick = data.tick;
        }
      } catch (err) {
        console.error("Tick fetch error:", err);
      }
    }

    fetchTick();
    const interval = setInterval(fetchTick, 2000); // check every 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <TickContext.Provider value={{ tick }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  return useContext(TickContext);
}
