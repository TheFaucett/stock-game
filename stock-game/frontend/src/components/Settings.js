import React, { useState } from "react";
import API_BASE_URL from "../apiConfig";
import "../styles/settings.css";

const profiles = ["default", "communist", "crisis", "bubble", "wildwest"];

export default function Settings() {
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
    } catch (err) {
      setStatus({ success: false, message: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>🛠️ Market Settings</h1>
      <p>Click a button to switch the active market profile:</p>

      <div className="profile-buttons">
        {profiles.map((profile) => (
          <button
            key={profile}
            onClick={() => applyProfile(profile)}
            disabled={loading}
            className="profile-button"
          >
            {profile}
          </button>
        ))}
      </div>

      {status && (
        <div
          className={`status-message ${status.success ? "success" : "error"}`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
