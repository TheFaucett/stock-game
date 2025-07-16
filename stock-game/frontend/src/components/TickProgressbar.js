import React from "react";
import { useTick } from "../TickProvider";


export default function TickProgressBar() {
  const { progress } = useTick(); // Only read progress from context
  console.log("TickProgressBar progress:", progress);
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
  transition: "width 0.13s linear",
  willChange: "width",
};
