require('dotenv').config();
console.log("🔧 Environment variables loaded,", process.env.MONGO_URI);

// ✅ GLOBAL ERROR HANDLERS — should be first!
process.on("unhandledRejection", (reason, promise) => {
  console.error("🧨 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const routeTimer = require('./middleware/routeTimer');
const payloadBudget = require('./middleware/payloadBudget');

// ⬇️ Routes
const stockRoutes = require('./routes/stockRoutes');
const globalNewsRoutes = require('./routes/globalNewsRoutes');
const sectorNewsRoutes = require('./routes/sectorNewsRoutes');
const stockNewsRoutes = require('./routes/stockNewsRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const userRoutes = require('./routes/userRoutes');
const marketData = require('./routes/marketData');
const bankRoutes = require('./routes/bankRoutes');
const featuredStockRoutes = require('./routes/featuredStockRoutes');
const firmRoutes = require('./routes/firmRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const tickRoutes = require('./routes/tickRoutes');

// ⬇️ Utils & controllers
const { updateMarket } = require('./controllers/marketController');
const { incrementTick, getTickLength } = require('./utils/tickTracker');
const resetStockPrices = require('./utils/resetStocks');

const app = express();
app.use(express.json());

// ✅ CORS
const allowedOrigins = [
  'https://stock-game-demo.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS not allowed for this origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.options('*', cors());

// ✅ ROUTES
app.use('/api', routeTimer, payloadBudget);
app.use('/api/market-data', marketData);
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/news/global', globalNewsRoutes);
app.use('/api/news/sector', sectorNewsRoutes);
app.use('/api/news/stock', stockNewsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/featured-stocks', featuredStockRoutes);
app.use('/api/firms', firmRoutes);
app.use('/api/tick', tickRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ✅ HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ✅ HEARTBEAT (helps confirm uptime)
setInterval(() => {
  console.log("💓 Heartbeat — backend process alive");
}, 30_000);

const PORT = process.env.PORT || 5000;
const tradeWindow = getTickLength() * 1000;

// ✅ CONNECT + START TICK LOOP
mongoose.connect(process.env.MONGO_URI, {
  // These are deprecated in Mongoose v7+, can remove:
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB Connected');

  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  let inFlight = false;

  setInterval(async () => {
    if (inFlight) {
      console.warn('⏭️ Skipping tick: previous still in progress');
      return;
    }

    inFlight = true;
    const tick = incrementTick();
    const t0 = process.hrtime.bigint();
    console.log(`⏳ Tick ${tick}: Running market update...`);

    try {
      await updateMarket();

      // ✅ Scheduled Reset Every 1000 Ticks
      if (tick % 1000 === 0) {
        console.log("🧹 Performing scheduled stock reset...");
        await resetStockPrices();
        console.log("✅ Scheduled reset complete.");
      }

    } catch (err) {
      console.error("❌ Tick error:", err);
    } finally {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      console.log(`⏱️ Tick ${tick} completed in ${ms.toFixed(1)}ms`);
      inFlight = false;
    }

  }, tradeWindow);

})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});
