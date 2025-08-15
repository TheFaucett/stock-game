// utils/patchkit.js
function ensure(map, id) {
  if (!map.has(id)) map.set(id, {});
  return map.get(id);
}

function mergeObjects(dst, src) {
  for (const k of Object.keys(src)) {
    const sv = src[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!dst[k]) dst[k] = {};
      mergeObjects(dst[k], sv);
    } else {
      dst[k] = sv;
    }
  }
}

// $set / $inc helpers
function addSet(map, id, obj) {
  const u = ensure(map, id);
  if (!u.$set) u.$set = {};
  mergeObjects(u.$set, obj);
}
function addInc(map, id, obj) {
  const u = ensure(map, id);
  if (!u.$inc) u.$inc = {};
  mergeObjects(u.$inc, obj);
}

// $push with optional slice (we standardize the shape)
function addPush(map, id, path, items, sliceLimit) {
  const u = ensure(map, id);
  if (!u.$push) u.$push = {};
  if (!u.$push[path]) u.$push[path] = { $each: [], $slice: sliceLimit ?? undefined };
  const entry = u.$push[path];
  entry.$each.push(...(Array.isArray(items) ? items : [items]));
  if (sliceLimit != null) entry.$slice = -Math.abs(sliceLimit);
}

// merge patch maps
function mergePatchMaps(...maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [id, upd] of m) {
      if (!out.has(id)) out.set(id, {});
      const dst = out.get(id);
      for (const op of ['$set', '$inc', '$push']) {
        if (upd[op]) {
          if (!dst[op]) dst[op] = {};
          mergeObjects(dst[op], upd[op]);
        }
      }
    }
  }
  return out;
}

// convert to Mongo bulkWrite
function toBulk(map) {
  const ops = [];
  for (const [id, update] of map) {
    ops.push({ updateOne: { filter: { _id: id }, update } });
  }
  return ops;
}

module.exports = { addSet, addInc, addPush, mergePatchMaps, toBulk };
