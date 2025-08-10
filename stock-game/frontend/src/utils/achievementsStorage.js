// src/utils/achievementsStorage.js

export function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem('achievements') || '[]');
}

export function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem('achievements', JSON.stringify(unlocked));
    return true;
  }
  return false;
}

// ✅ NEW: Mark when the user last checked
export function getSeenAchievements() {
  return JSON.parse(localStorage.getItem('lastViewedAchievements') || '[]');
}

export function markAchievementsAsSeen() {
  const unlocked = getUnlockedAchievements();
  localStorage.setItem('lastViewedAchievements', JSON.stringify(unlocked));
}

export function hasNewAchievements() {
  const seen = getSeenAchievements();
  const unlocked = getUnlockedAchievements();
  return unlocked.some(id => !seen.includes(id));
}
