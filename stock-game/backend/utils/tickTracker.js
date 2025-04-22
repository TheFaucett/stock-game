let currentTick = 0;

function incrementTick() {
  currentTick++;
  return currentTick;
}

function getCurrentTick() {
  return currentTick;
}

module.exports = { incrementTick, getCurrentTick };
