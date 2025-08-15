module.exports = function payloadBudget(req, res, next) {
  const end = res.end;
  res.end = function (chunk, encoding, cb) {
    try {
      if (chunk) {
        const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding);
        res.setHeader('X-Payload-Bytes', String(len));
        if (len > 512000) console.error('🚨 payload > 500KB', req.originalUrl, len);
        else if (len > 200000) console.warn('⚠️ payload > 200KB', req.originalUrl, len);
      }
    } catch {}
    return end.call(this, chunk, encoding, cb);
  };
  next();
};
