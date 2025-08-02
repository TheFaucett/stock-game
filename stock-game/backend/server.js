require('dotenv').config();
const cors = require('cors');
console.log("🔧 Environment variables loaded, ", process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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
app.use(cors({
    origin: 'https://stock-game-demo.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// -----------------------------
// 📌 API ROUTES
// -----------------------------
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
    
    // Start server *after* DB is connected
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    // Start interval *after* DB is connected
    setInterval(async () => {
        const tick = incrementTick();
        console.log(`⏳ Tick ${tick}: Running market update...`);
        await updateMarket();
    }, tradeWindow);

})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
});
