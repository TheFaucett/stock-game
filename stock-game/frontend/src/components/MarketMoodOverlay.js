import React, { useState, useEffect } from "react";
import { useTick } from "../TickProvider";
import API_BASE_URL from "../apiConfig";
import "../styles/marketMoodOverlay.css";

export default function MarketMoodOverlay() {
  const [mood, setMood] = useState("neutral");
  const { tick } = useTick();

  useEffect(() => {
    async function fetchMood() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-data/mood`);
        const data = await res.json();
        if (data?.mood) {
          setMood(data.mood);
        }
      } catch (err) {
        console.error("Error fetching market mood:", err);
      }
    }
    fetchMood();
  }, [tick]); // update when the market ticks

  return <div className={`market-mood-overlay ${mood}`} />;
}
