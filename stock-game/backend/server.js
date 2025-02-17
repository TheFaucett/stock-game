const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const globalNewsRoutes = require('./routes/globalNewsRoutes');
const sectorNewsRoutes = require('./routes/sectorNewsRoutes');
const stockNewsRoutes = require('./routes/stockNewsRoutes');
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

const tradeWindow = 1000 * 1; // 30 seconds
setInterval(async () => {
    console.log("⏳ Running market update...");
    await updateMarket();
}, tradeWindow);

// 📌 Use Routes
app.use('/api/news/global', globalNewsRoutes);
app.use('/api/news/sector', sectorNewsRoutes);
app.use('/api/news/stock', stockNewsRoutes);

// 📌 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
