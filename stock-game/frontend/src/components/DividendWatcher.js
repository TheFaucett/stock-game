import React, { useState, useEffect } from "react";
import DividendConfetti from "./DividendConfetti";

export default function DividendWatcher({ tick }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (tick > 0 && tick % 90 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000); // reset after animation
    }
  }, [tick]);

  return <>{showConfetti && <DividendConfetti trigger={showConfetti} />}</>;
}
