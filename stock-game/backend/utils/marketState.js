const defaultProfile = require("../profiles/default");

let currentProfile = { ...defaultProfile };

function getMarketProfile() {
  return currentProfile;
}

function loadMarketProfile(profile) {
  currentProfile = { ...defaultProfile, ...profile };
  console.log(`✅ Market profile loaded: ${profile.name || "custom"}`);
}

function resetMarketProfile() {
  currentProfile = { ...defaultProfile };
  console.log("🔁 Market profile reset to default.");
}

module.exports = {
  getMarketProfile,
  loadMarketProfile,
  resetMarketProfile
};
