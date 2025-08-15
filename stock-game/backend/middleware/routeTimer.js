// middleware/routeTimer.js
module.exports = function routeTimer(req, res, next) {
  const start = process.hrtime.bigint();

  const end = res.end;
  res.end = function (chunk, encoding, cb) {
    try {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      res.setHeader('X-Route-Ms', ms.toFixed(1));
      if (ms > 250) {
        console.warn('⏱️ Slow route', req.method, req.originalUrl, `${ms.toFixed(1)}ms`);
      }
    } catch {}
    return end.call(this, chunk, encoding, cb);
  };

  // (Optional) still keep a finish log for correlation (headers are already sent)
  res.on('finish', () => {
    // no header setting here — too late — just side logging if you want
  });

  next();
};
