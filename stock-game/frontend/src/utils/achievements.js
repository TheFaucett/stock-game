// src/utils/achievements.js

export const ACHIEVEMENTS = [
  {
    id: 'long_play',
    name: 'Marathon Trader',
    desc: 'Stay in the game for 500 ticks.',
    trigger: 'tick',
    check: (p) => (p?.ticksPlayed ?? 0) >= 500,
  },
  {
    id: 'rich',
    name: 'Millionaire 💰',
    desc: 'Reach a balance of $1,000,000.',
    trigger: 'tick',
    check: (p) => p?.balance >= 1_000_000,
  },
  {
    id: 'broke',
    name: 'Broke 💀',
    desc: 'Balance drops below $1,000.',
    trigger: 'tick',
    check: (p) => p?.balance <= 1_000,
  },
  {
    id: 'first_100k',
    name: 'Getting Started 💵',
    desc: 'Reach a balance of $100,000.',
    trigger: 'tick',
    check: (p) => p?.balance >= 100_000,
  },
  {
    id: 'ten_k_club',
    name: '50K Club 🏅',
    desc: 'Reach a balance of $50,000.',
    trigger: 'tick',
    check: (p) => p?.balance >= 50_000,
  },
  {
    id: 'stock_holder',
    name: 'Holder 📦',
    desc: 'Own at least one share of any stock.',
    trigger: 'tick',
    check: (p) => {
      if (!p?.ownedShares) return false;
      return Object.values(p.ownedShares).some(qty => qty > 0);
    }
  },
  {
    id: 'diversified',
    name: 'Diversified 📊',
    desc: 'Hold 5 or more different stocks.',
    trigger: 'tick',
    check: (p) => {
      if (!p?.ownedShares) return false;
      return Object.values(p.ownedShares).filter(qty => qty > 0).length >= 5;
    }
  },
  {
    id: 'all_in',
    name: 'All In 🫣',
    desc: 'Balance drops below $10 but you own stocks.',
    trigger: 'tick',
    check: (p) => {
      const owns = p?.ownedShares && Object.values(p.ownedShares).some(qty => qty > 0);
      return owns && p?.balance < 10;
    }
  },
  {
    id: 'idle_rich',
    name: 'Passive Gains 📈',
    desc: 'Reach $20,000 without owning any stocks.',
    trigger: 'tick',
    check: (p) => {
      const ownsNothing = p?.ownedShares && Object.values(p.ownedShares).every(qty => qty === 0);
      return ownsNothing && p?.balance >= 20_000;
    }
  },
  {
    id: 'tick_grinder',
    name: 'Tick Grinder ⏱️',
    desc: 'Play for 100 ticks.',
    trigger: 'tick',
    check: (p) => (p?.ticksPlayed ?? 0) >= 100,
  },
  {
    id: 'max_diversity',
    name: 'Collector 🧺',
    desc: 'Own shares in 10 or more different stocks.',
    trigger: 'tick',
    check: (p) => {
      if (!p?.ownedShares) return false;
      return Object.values(p.ownedShares).filter(qty => qty > 0).length >= 10;
    }
  }
];
