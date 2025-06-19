export function getOrCreateUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    // Make a random user id string: "u_" + timestamp + random
    userId = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('userId', userId);
  }
  return userId;
}
