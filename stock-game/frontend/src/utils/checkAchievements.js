// src/utils/checkAchievements.js

import { ACHIEVEMENTS } from './achievements';
import { unlockAchievement, getUnlockedAchievements } from './achievementsStorage';

export function checkAchievements(portfolio) {
  console.log("🔍 Running checkAchievements with portfolio:", portfolio);

  if (!portfolio) return;

  const unlocked = getUnlockedAchievements();
  console.log("Already unlocked:", unlocked);

  ACHIEVEMENTS.forEach(a => {
    const meetsCondition = typeof a.check === 'function' && a.check(portfolio);
    console.log(`Checking ${a.id}: condition=${meetsCondition}`);

    if (!unlocked.includes(a.id) && meetsCondition) {
      if (unlockAchievement(a.id)) {
        console.log(`🏆 Achievement unlocked: ${a.name}`);
        document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: a }));
      }
    }
  });
}

