// utils/tick.js
let currentTick = 0;
const TICK_LENGTH = 0.5; // seconds

function incrementTick() {
  currentTick++;
  return currentTick;
}

function getCurrentTick() {
  return currentTick;
}

function getTickLength() {
  return TICK_LENGTH;
}

module.exports = { incrementTick, getCurrentTick, getTickLength };
