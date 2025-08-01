import React, { useEffect, useState } from "react";
import { useTick } from "../TickProvider";

export default function TickProgressBar() {
  const { tick } = useTick(); // only care about tick changes
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (tick == null) return;

    // Reset to 0 when tick changes
    setProgress(0);

    // Animate over 30 seconds
    const start = Date.now();
    const TICK_LENGTH = 30000; // 30 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / TICK_LENGTH, 1)); // cap at 1
    }, 100); // update 10x/sec for smoothness

    return () => clearInterval(interval);
  }, [tick]); // re-run when tick changes

  return (
    <div style={barContainerStyle}>
      <div
        style={{
          ...barFillStyle,
          width: `${(progress * 100).toFixed(2)}%`,
          background: "linear-gradient(90deg, #fd9100 0%, #fda500 60%, #fdc800 100%)",
        }}
      />
    </div>
  );
}

const barContainerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "6px",
  zIndex: 9999,
  background: "rgba(0,0,0,0.06)",
  boxShadow: "0 2px 6px 0 rgba(0,0,0,0.03)",
};

const barFillStyle = {
  height: "100%",
  borderRadius: "6px",
  transition: "width 0.1s linear",
  willChange: "width",
};
