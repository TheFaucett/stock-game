const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

let clientBalance = 10000;
const ownedShares = {};
// Enable CORS so frontend can access backend
app.use(cors());
app.use(express.json()); // Enable JSON body parsing
// Simple route to send a message
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});


const stocks = [ //an array of objects
    { ticker: 'ASTC', price: 153.42, change: 2.45, sector: 'Industrials' },
    { ticker: 'GRBX', price: 27.85, change: -0.32, sector: 'Energy' },
    { ticker: 'HMTL', price: 345.68, change: 1.12, sector: 'Health Care' },
    { ticker: 'FNXY', price: 92.30, change: -1.67, sector: 'Financials' },
    { ticker: 'CNTK', price: 18.45, change: 0.56, sector: 'Consumer Staples' },
    { ticker: 'GLMT', price: 57.19, change: 1.03, sector: 'Information Technology' },
    { ticker: 'VTRD', price: 42.76, change: -0.78, sector: 'Materials' },
    { ticker: 'TRFX', price: 66.21, change: 2.34, sector: 'Utilities' },
    { ticker: 'PXNL', price: 15.97, change: -0.12, sector: 'Communication Services' },
    { ticker: 'AETH', price: 210.43, change: 3.67, sector: 'Consumer Discretionary' },
    { ticker: 'DRVN', price: 84.56, change: -0.23, sector: 'Industrials' },
    { ticker: 'SUNR', price: 32.12, change: 1.89, sector: 'Energy' },
    { ticker: 'MEDX', price: 452.23, change: 2.11, sector: 'Health Care' },
    { ticker: 'CAPF', price: 110.50, change: -1.45, sector: 'Financials' },
    { ticker: 'NATF', price: 24.78, change: 0.45, sector: 'Consumer Staples' },
    { ticker: 'CODE', price: 82.34, change: 3.21, sector: 'Information Technology' },
    { ticker: 'STEL', price: 47.89, change: -0.56, sector: 'Materials' },
    { ticker: 'ECOG', price: 54.90, change: 1.87, sector: 'Utilities' },
    { ticker: 'VIDE', price: 21.45, change: 0.67, sector: 'Communication Services' },
    { ticker: 'LUXY', price: 315.67, change: 2.45, sector: 'Consumer Discretionary' },
    { ticker: 'LOGI', price: 67.12, change: 0.98, sector: 'Information Technology' },
    { ticker: 'SPHR', price: 135.45, change: 1.45, sector: 'Industrials' },
    { ticker: 'HYDN', price: 39.24, change: -1.12, sector: 'Energy' },
    { ticker: 'BIOM', price: 268.78, change: 3.45, sector: 'Health Care' },
    { ticker: 'WLTN', price: 98.45, change: -2.13, sector: 'Financials' },
    { ticker: 'PURE', price: 56.12, change: 0.32, sector: 'Consumer Staples' },
    { ticker: 'TECH', price: 145.76, change: 2.67, sector: 'Information Technology' },
    { ticker: 'GOLD', price: 65.43, change: -0.89, sector: 'Materials' },
    { ticker: 'WAVE', price: 78.90, change: 1.56, sector: 'Utilities' },
    { ticker: 'STREAM', price: 34.12, change: 0.78, sector: 'Communication Services' },
    { ticker: 'FANC', price: 403.21, change: 2.89, sector: 'Consumer Discretionary' },
    { ticker: 'SKYH', price: 122.78, change: 3.45, sector: 'Industrials' },
    { ticker: 'WIND', price: 48.34, change: -0.56, sector: 'Energy' },
    { ticker: 'GENX', price: 372.23, change: 1.98, sector: 'Health Care' },
    { ticker: 'FINT', price: 140.67, change: -1.34, sector: 'Financials' },
    { ticker: 'ORGN', price: 62.34, change: 0.21, sector: 'Consumer Staples' },
    { ticker: 'NETX', price: 178.90, change: 3.12, sector: 'Information Technology' },
    { ticker: 'BRCK', price: 49.12, change: -1.67, sector: 'Materials' },
    { ticker: 'AQUA', price: 72.45, change: 2.34, sector: 'Utilities' },
    { ticker: 'TALK', price: 41.23, change: 1.23, sector: 'Communication Services' },
    { ticker: 'EXQT', price: 245.78, change: 3.45, sector: 'Consumer Discretionary' },
    { ticker: 'SYNR', price: 19.89, change: 0.67, sector: 'Utilities' },
    { ticker: 'XRAY', price: 98.34, change: -0.23, sector: 'Health Care' },
    { ticker: 'FLOP', price: 56.21, change: 1.09, sector: 'Consumer Staples' },
    { ticker: 'DINO', price: 27.89, change: -0.67, sector: 'Energy' },
    { ticker: 'BYTE', price: 210.45, change: 2.45, sector: 'Information Technology' },
    { ticker: 'COTN', price: 48.67, change: -1.45, sector: 'Materials' },
    { ticker: 'LITE', price: 29.45, change: 0.34, sector: 'Utilities' },
    { ticker: 'MOVI', price: 64.34, change: -0.89, sector: 'Communication Services' },
    { ticker: 'FEVR', price: 341.12, change: 3.67, sector: 'Consumer Discretionary' },
];

let newsData = require('./news.json');



const sensitivity = 0.5;

let currentNews = null; 
const tradeWindow = 30000; // 30 seconds 

function ogHistory(stock) {
    const history = [];
    let currentPrice = stock.price;

    for (let i = 0; i < 30; i++) {
        const fluctuation = (Math.random()- 0.5) * 2; //(+ or - 1)
        currentPrice += (currentPrice * fluctuation) / 100;
        history.push(parseFloat(currentPrice.toFixed(2)));
    }
    return history;

}

stocks.forEach((stock) => {
    stock.history = ogHistory(stock);

})

function getRandomNews() {
    const sectorEntries = Object.values(newsData.sectors).flat();
    if (sectorEntries.length === 0) {
        console.error('No news data available');
        return null;
    }
    return sectorEntries[Math.floor(Math.random() * sectorEntries.length)];
}

function applyNewsImpact() {
    if (currentNews) {
        const stock = stocks.find((s) => s.ticker === currentNews.ticker);
        if (stock) {
            const priceChange = (currentNews.sentimentScore * sensitivity) / 100 * stock.price;
            const newPrice = parseFloat((stock.price + priceChange).toFixed(2));

            // Update stock price and history
            stock.history.push(newPrice);
            if (stock.history.length > 30) {
                stock.history.shift(); // Keep only the last 30 days
            }
            const previousPrice = stock.history[stock.history.length - 2] || stock.price;
            stock.price = newPrice;
            stock.change = parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));

            console.log(`Stock ${stock.ticker} updated: Price = ${stock.price}, Change = ${stock.change}%`);
        } else {
            console.warn(`No stock found for ticker: ${currentNews.ticker}`);
        }
        currentNews = null; // Clear current news after applying impact
    } else {
        console.warn('No current news to apply impact.');
    }
}

// Periodically fetch new news and apply impact
setInterval(() => {
    currentNews = getRandomNews();
    console.log('New current news:', currentNews);
    if (currentNews) {
        // Apply news impact after trade window
        setTimeout(applyNewsImpact, tradeWindow);
    }
}, tradeWindow); // Refresh every 30 seconds

// API Endpoints
app.get('/api/stocks', (req, res) => {
    console.log("GET /api/stocks CALLED");
    res.json(stocks);
});

app.get('/api/news', (req, res) => {
    console.log("GET /api/news CALLED");
    res.json(newsData);
});

app.get('/api/news/sector/:sector', (req, res) => {
    const sector = req.params.sector.toLowerCase();
    const sectorData = newsData.sectors[sector];
    if (!sectorData) {
        return res.status(404).json({ error: `Sector '${sector}' not found.` });
    }
    res.json(sectorData);
});

app.get('/api/news/ticker/:ticker', (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const sectorEntries = Object.values(newsData.sectors).flat();
    const tickerNews = sectorEntries.filter((item) => item.ticker === ticker);
    if (tickerNews.length === 0) {
        return res.status(404).json({ error: `No news found for ticker '${ticker}'.` });
    }
    res.json(tickerNews);
});

app.get('/api/current-news', (req, res) => {
    console.log("GET /api/current-news CALLED");
    if (currentNews) {
        res.json(currentNews);
    } else {
        res.status(404).json({ message: 'No news currently available.' });
    }
});

app.get('/api/balance', (req, res) => {
    console.log("GET /api/balance CALLED");
    res.json({ balance: clientBalance });
});

app.post('/api/balance', (req, res) => {
    const { type, amount, ticker } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid transaction amount' });
    }

    const stock = stocks.find((s) => s.ticker === ticker);
    if (!stock) {
        return res.status(400).json({ error: `Stock with ticker '${ticker}' not found.` });
    }

    const transactionAmount = amount * stock.price;

    if (type === 'buy' && clientBalance >= transactionAmount) {
        clientBalance -= transactionAmount;
        ownedShares[stock.ticker] = (ownedShares[stock.ticker] || 0) + amount;
    } else if (type === 'sell') {
        if (!ownedShares[stock.ticker] || ownedShares[stock.ticker] < amount) {
            return res.status(400).json({ error: 'Not enough shares to sell.' });
        }
        clientBalance += transactionAmount;
        ownedShares[stock.ticker] -= amount;
        if (ownedShares[stock.ticker] <= 0) {
            delete ownedShares[stock.ticker];
        }
    } else {
        return res.status(400).json({ error: 'Invalid transaction or insufficient funds.' });
    }

    res.json({ balance: clientBalance });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});