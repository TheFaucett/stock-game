import React, { createContext, useContext, useEffect, useState } from "react";

const TICK_LENGTH = 30000; // 30 seconds
const TickContext = createContext();

export function TickProvider({ children }) {
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Sync tick to wall clock
    function update() {
      const now = Date.now();
      const currentTick = Math.floor(now / TICK_LENGTH);
      setTick(currentTick);
      setProgress((now % TICK_LENGTH) / TICK_LENGTH);
    }
    update(); // Immediate update
    const interval = setInterval(update, 60); // Smooth bar
    return () => clearInterval(interval);
  }, []);

  return (
    <TickContext.Provider value={{ tick, progress, TICK_LENGTH }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  return useContext(TickContext);
}
 