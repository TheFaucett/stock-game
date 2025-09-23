// backend/scenarios/volatility.js

module.exports = {
  id: "volatility",
  title: "Volatility: Risk and Reward",
  description: "Navigate a turbulent market. Can you grow your portfolio without getting wiped out?",

  tickLimit: 20,
  startBalance: 10000,

  winCondition: {
    portfolioValue: 11000,   // Grow to $11k
    maxDrawdown: 0.2         // Don't lose more than 20% from peak
  },

  marketModifiers: {
    volatilityMultiplier: 2.6, // Increase overall randomness
    sectorBias: {
      utilities: 0.02,         // Utilities do slightly better
      tech: -0.03              // Tech underperforms
    }
  },

  tutorialSteps: [
    { tick: 1, text: "Volatility is high — some stocks will swing wildly." },
    { tick: 5, text: "Diversify into sectors like Utilities to stay steady." },
    { tick: 10, text: "Try to grow your balance while avoiding big crashes." }
  ]
};
