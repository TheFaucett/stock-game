// src/achievements.js
export const ACHIEVEMENTS = [
  {
    id: 'long_play',
    name: 'Marathon Trader',
    desc: 'Stay in the game for 500 ticks.',
    trigger: 'tick',
    check: () => {
      const ticks = (parseInt(localStorage.getItem('ticksPlayed') || '0', 10)) + 1;
      localStorage.setItem('ticksPlayed', ticks);
      return ticks >= 500;
    }
  },
  {
    id: 'rich',
    name: 'Millionaire 💰',
    desc: 'Reach a balance of $1,000,000.',
    trigger: 'tick',
    check: () => {
      const balance = parseFloat(localStorage.getItem('lastBalance') || '0');
      return balance >= 1_000_000;
    }
  },
  {
    id: 'broke',
    name: 'Broke 💀',
    desc: 'Balance drops below $1,000.',
    trigger: 'tick',
    check: () => {
      const balance = parseFloat(localStorage.getItem('lastBalance') || '0');
      return balance <= 1_000;
    }
  }
];
