require('dotenv').config();
console.log("🔧 Environment variables loaded,", process.env.MONGO_URI);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const routeTimer = require('./middleware/routeTimer');
const payloadBudget = require('./middleware/payloadBudget')
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
const { incrementTick, getTickLength } = require('./utils/tickTracker');

const app = express();



app.use(express.json());

// ✅ CORS configuration
const allowedOrigins = [
    'https://stock-game-demo.vercel.app', // production frontend
    'http://localhost:3000'               // local dev frontend
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl)
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

// ✅ Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

// -----------------------------
// 📌 API ROUTES
// -----------------------------

app.use('/api', routeTimer, payloadBudget)
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
// 📌 Database Connection and Tick Start
// -----------------------------
const PORT = process.env.PORT || 5000;
const tradeWindow = getTickLength() * 1000; // ms

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    setInterval(async () => {
        const tick = incrementTick();
        console.log(`⏳ Tick ${tick}: Running market update...`);
        await updateMarket();
    }, tradeWindow);

    let inFlight = false;
    setInterval(async () => {
    if (inFlight) { console.warn('⏭️ Skip tick: prev still running'); return; }
    inFlight = true;
    const t0 = process.hrtime.bigint();
    try { await updateMarket(); }
    finally {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        inFlight = false;
        console.log(`⏱️ tick took ${ms.toFixed(1)}ms`);
    }
    }, tradeWindow);


})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
});
// -----------------------------
// 📌 Error Handling Middleware
// -----------------------------
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});