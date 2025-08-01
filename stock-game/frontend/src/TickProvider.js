// TickProvider.js
import React, { createContext, useContext, useEffect, useState } from "react";
import API_BASE_URL from "./apiConfig";

const TickContext = createContext();

export function TickProvider({ children }) {
  const [tick, setTick] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchTick() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tick`);
        const data = await res.json();
        if (isMounted && typeof data.tick === "number") {
          setTick(data.tick);
        }
      } catch (err) {
        console.error("Failed to fetch tick:", err);
      }
    }

    // Fetch immediately
    fetchTick();

    // Refresh every 2 seconds (or whatever fits your tick length)
    const interval = setInterval(fetchTick, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <TickContext.Provider value={{ tick, progress }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  return useContext(TickContext);
}
