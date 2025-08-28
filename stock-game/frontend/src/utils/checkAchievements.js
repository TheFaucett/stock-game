// src/utils/checkAchievements.js

import { ACHIEVEMENTS } from './achievements';
import { unlockAchievement, getUnlockedAchievements } from './achievementsStorage';

/**
 * Check all relevant achievements for a given event type.
 * @param {any} payload - Context data for the check function (usually portfolio)
 * @param {string} eventType - Type of event: 'tick', 'trade', etc.
 */
export function checkAchievements(payload, eventType = 'tick') {
  console.log(`🔍 Running checkAchievements for event: '${eventType}' with:`, payload);

  const unlocked = getUnlockedAchievements();
  console.log("🔓 Already unlocked:", unlocked);

  ACHIEVEMENTS
    .filter(a => a.trigger === eventType)
    .forEach(a => {
      const meetsCondition = typeof a.check === 'function' && a.check(payload);
      console.log(`🧪 Checking ${a.id}: condition=${meetsCondition}`);

      if (!unlocked.includes(a.id) && meetsCondition) {
        if (unlockAchievement(a.id)) {
          console.log(`🏆 Achievement unlocked: ${a.name}`);
          document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: a }));
        }
      }
    });
}
