// backend/utils/economicEnvironment.js

let inflationRate = 0.02; // 2% baseline
let currencyStrength = 1.0; // Neutral

let activeEvent = null;
const allEvents = [
  {
    name: "recession",
    duration: () => 10 + Math.floor(Math.random() * 5), // 10–14 ticks
    modifiers: { inflationDelta: 0.02, currencyDelta: -0.2 }
  },
  {
    name: "boom",
    duration: () => 10 + Math.floor(Math.random() * 5),
    modifiers: { inflationDelta: 0.01, currencyDelta: 0.15 }
  },
  {
    name: "currency_crisis",
    duration: () => 7 + Math.floor(Math.random() * 7),
    modifiers: { inflationDelta: 0.05, currencyDelta: -0.5 }
  }
];

function triggerMacroEvent() {
  if (activeEvent) return;
  const event = allEvents[Math.floor(Math.random() * allEvents.length)];
  activeEvent = {
    name: event.name,
    ticksRemaining: event.duration(),
    modifiers: event.modifiers
  };
  console.log(`🌐 Macro event started: ${activeEvent.name} for ${activeEvent.ticksRemaining} ticks`);
}

function advanceMacroEvent() {
  if (!activeEvent) return;
  inflationRate += activeEvent.modifiers.inflationDelta;
  currencyStrength += activeEvent.modifiers.currencyDelta;
  inflationRate = Math.max(0, Math.min(0.2, inflationRate));
  currencyStrength = Math.max(0.1, Math.min(2, currencyStrength));
  activeEvent.ticksRemaining -= 1;
  if (activeEvent.ticksRemaining <= 0) {
    console.log(`✅ Macro event ended: ${activeEvent.name}`);
    activeEvent = null;
  }
}

function maybeApplyShock() {
  const macroChance = 0.025; // 2.5% per tick
  if (!activeEvent && Math.random() < macroChance) {
    triggerMacroEvent();
  }
  advanceMacroEvent();
}

function getEconomicFactors() {
  return {
    inflationRate,
    currencyStrength,
    macroEvent: activeEvent ? activeEvent.name : null,
    macroEventTicks: activeEvent ? activeEvent.ticksRemaining : 0
  };
}

module.exports = {
  maybeApplyShock,   // Call this every tick
  getEconomicFactors // Use this for up-to-date info
};
