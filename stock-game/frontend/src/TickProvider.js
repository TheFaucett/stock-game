// TickProvider.js
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import API_BASE_URL from "./apiConfig";

const TickContext = createContext();

export function TickProvider({ children }) {
  const [tick, setTick] = useState(null);
  const lastTickRef = useRef(null); // ✅ useRef keeps value across renders

  useEffect(() => {
    async function fetchTick() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tick`);
        const data = await res.json();
        if (typeof data.tick === "number" && data.tick !== lastTickRef.current) {
          setTick(data.tick);
          lastTickRef.current = data.tick; // ✅ persist last seen tick
        }
      } catch (err) {
        console.error("Tick fetch error:", err);
      }
    }

    fetchTick();
    const interval = setInterval(fetchTick, 2000);
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
