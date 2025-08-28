require('dotenv').config();
console.log("🔧 Environment variables loaded,", process.env.MONGO_URI);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const routeTimer = require('./middleware/routeTimer');
const payloadBudget = require('./middleware/payloadBudget');
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

const { updateMarket } = require('./controllers/marketController');
const { incrementTick, getTickLength, getCurrentTick } = require('./utils/tickTracker');
const resetStockPrices = require('./utils/resetStocks');

const app = express();

app.use(express.json());

// ✅ CORS configuration
const allowedOrigins = [
    'https://stock-game-demo.vercel.app',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('CORS not allowed for this origin: ' + origin));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

app.options('*', cors());

// -----------------------------
// 📌 API ROUTES
// -----------------------------
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

// -----------------------------
// 📌 Server + Ticks + Reset Logic
// -----------------------------
const PORT = process.env.PORT || 5000;
const tradeWindow = getTickLength() * 1000;

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    // ✅ Reset stock prices on boot
    try {
        console.log("🔄 Performing initial stock reset...");
        await resetStockPrices();
        console.log("✅ Stock reset complete.");
    } catch (err) {
        console.error("❌ Error during initial reset:", err);
    }

    let inFlight = false;

    setInterval(async () => {
        if (inFlight) {
            console.warn('⏭️ Skipping tick: previous still in progress');
            return;
        }
        inFlight = true;

        const tick = incrementTick();
        console.log(`⏳ Tick ${tick}: Running market update...`);
        const t0 = process.hrtime.bigint();

        try {
            await updateMarket();

            // ✅ Reset every 1000 ticks
            if (tick % 1000 === 0) {
                console.log("🧹 Performing scheduled stock reset...");
                await resetStockPrices();
                console.log("✅ Scheduled reset complete.");
            }

        } catch (err) {
            console.error("❌ Tick error:", err);
        } finally {
            const ms = Number(process.hrtime.bigint() - t0) / 1e6;
            inFlight = false;
            console.log(`⏱️ Tick ${tick} completed in ${ms.toFixed(1)}ms`);
        }
    }, tradeWindow);

})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
});

// -----------------------------
// 📌 Health Check
// -----------------------------
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});
