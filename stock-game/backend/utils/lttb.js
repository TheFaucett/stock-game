// utils/lttb.js
// Largest-Triangle-Three-Buckets for number[] or object[] (xKey/yKey optional)
function lttb(points, threshold, xKey, yKey) {
  const n = Array.isArray(points) ? points.length : 0;
  const t = Math.max(3, Math.min((threshold | 0) || 0, n));
  if (n <= t) return points.slice();

  // normalize -> {x,y}
  const first = points[0];
  const toXY = (p, i) => {
    if (typeof first === "number") return { x: i, y: Number(p) };
    if (xKey && yKey) return { x: Number(p[xKey]), y: Number(p[yKey]) };
    const lower = Object.keys(first).reduce((a, k) => ((a[k.toLowerCase()] = k), a), {});
    const xK = lower.timestamp || lower.ts || lower.time || lower.t || lower.tick || lower.x;
    const yK = lower.value || lower.v || lower.index || lower.price || lower.y;
    const x = xK ? Number(p[xK]) : i;
    const y = yK ? Number(p[yK]) : Number(p);
    return { x, y };
  };
  const xy = points.map(toXY);

  const sampled = new Array(t);
  let sampledIndex = 0;
  const every = (n - 2) / (t - 2);
  let a = 0;
  sampled[sampledIndex++] = xy[a];

  for (let i = 0; i < t - 2; i++) {
    const avgStart = Math.floor((i + 1) * every) + 1;
    const avgEnd = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0, avgY = 0, len = Math.max(1, avgEnd - avgStart);
    for (let j = avgStart; j < avgEnd; j++) {
      avgX += xy[j].x; avgY += xy[j].y;
    }
    avgX /= len; avgY /= len;

    const rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    let maxArea = -1, maxIdx = rangeOffs;
    for (let j = rangeOffs; j < rangeTo; j++) {
      const ax = xy[a].x, ay = xy[a].y;
      const bx = xy[j].x, by = xy[j].y;
      const area = Math.abs((ax - avgX) * (by - ay) - (ax - bx) * (avgY - ay)) * 0.5;
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    sampled[sampledIndex++] = xy[maxIdx];
    a = maxIdx;
  }

  sampled[sampledIndex++] = xy[n - 1];

  // return in same shape as input
  if (typeof first === "number") return sampled.map(p => p.y);
  return sampled.map(({ x, y }) => ({ x, y }));
}

module.exports = { lttb };
