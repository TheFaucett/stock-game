// src/utils/achievementsStorage.js

export function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem('achievements') || '[]');
}

export function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem('achievements', JSON.stringify(unlocked));
    return true; // return true if this is a *new* unlock
  }
  return false; // already unlocked
}
