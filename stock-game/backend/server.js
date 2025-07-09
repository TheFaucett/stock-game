const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

//ROUTES
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
const tickRoutes = require('./routes/tickRoutes'); 
const leaderboardRoutes = require('./routes/leaderboardRoutes');
//CONTROLLERS
const { updateMarket } = require('./controllers/marketController');



const app = express();
app.use(express.json());
app.use(cors());

// 📌 Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

const tradeWindow = 30000 //30 seconds
setInterval(async () => {
    console.log("⏳ Running market update...");
    await updateMarket();
}, tradeWindow);

// 📌 Use Routes
app.use('/api/market-data', marketData);
app.use('/api/users', userRoutes)
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
// 📌 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
