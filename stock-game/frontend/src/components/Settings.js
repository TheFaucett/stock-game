import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API_BASE_URL from "../apiConfig";
import "../styles/settings.css";

const profiles = ["default", "communist", "crisis", "bubble", "wildwest"];

const profileEmojiMap = {
  default: "💼",
  communist: "🧱",
  crisis: "📉",
  bubble: "🫧",
  wildwest: "🤠",
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyProfile = async (profileName) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-data/load-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to apply profile");

      setStatus({ success: true, message: `✅ Loaded: ${json.loaded}` });

      // 🔄 Refetch market profile in all components
      queryClient.invalidateQueries(["market-profile"]);

    } catch (err) {
      setStatus({ success: false, message: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>🛠️ Market Settings</h1>
      <p>Select a profile to switch the market environment:</p>

      <div className="profile-buttons">
        {profiles.map((profile) => (
          <button
            key={profile}
            onClick={() => applyProfile(profile)}
            disabled={loading}
            className="profile-button"
          >
            {profileEmojiMap[profile]} {profile}
          </button>
        ))}
      </div>

      {status && (
        <div className={`status-message ${status.success ? "success" : "error"}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
