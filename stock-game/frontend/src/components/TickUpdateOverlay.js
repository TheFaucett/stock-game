import React, { useEffect, useState } from "react";
import { useTick } from "../TickProvider";
import "../styles/tickUpdateOverlay.css"; // 👈 new CSS file

export default function TickUpdateOverlay() {
  const { tick } = useTick();
  const [visible, setVisible] = useState(false);
  const [fadeState, setFadeState] = useState("hidden"); // "hidden" | "fade-in" | "fade-out"

  useEffect(() => {
    if (tick != null) {
      // Trigger fade-in
      setFadeState("fade-in");
      setVisible(true);

      // Start fade-out after 1s
      const fadeOutTimer = setTimeout(() => {
        setFadeState("fade-out");
      }, 1000);

      // Fully hide after fade-out duration
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setFadeState("hidden");
      }, 1500); // matches CSS transition time

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [tick]);

  if (!visible) return null;

  return (
    <div className={`tick-overlay ${fadeState}`}>
      <div className="tick-overlay-text">🔄 Updating Market...</div>
    </div>
  );
}
