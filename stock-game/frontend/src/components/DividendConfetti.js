import React, { useEffect, useState } from "react";
import "../styles/dividendConfetti.css";

export default function DividendConfetti({ trigger }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (trigger) {
      const burst = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.5}s`
      }));
      setItems(burst);

      // Clear after animation finishes
      const timer = setTimeout(() => setItems([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className="dividend-confetti-container">
      {items.map((item) => (
        <span
          key={item.id}
          className="dividend-emoji"
          style={{
            left: item.left,
            animationDelay: item.delay
          }}
        >
          💸
        </span>
      ))}
    </div>
  );
}
