const express = require('express');
const cors = require('cors');


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


const stocks = [
    { ticker: 'ASTC', price: 153.42, change: 2.45, sector: 'Industrials', peRatio: 18.5 },
    { ticker: 'GRBX', price: 27.85, change: -0.32, sector: 'Energy', peRatio: 14.3 },
    { ticker: 'HMTL', price: 345.68, change: 1.12, sector: 'Health Care', peRatio: 22.7 },
    { ticker: 'FNXY', price: 92.30, change: -1.67, sector: 'Financials', peRatio: 12.9 },
    { ticker: 'CNTK', price: 18.45, change: 0.56, sector: 'Consumer Staples', peRatio: 19.1 },
    { ticker: 'GLMT', price: 57.19, change: 1.03, sector: 'Information Technology', peRatio: 25.4 },
    { ticker: 'VTRD', price: 42.76, change: -0.78, sector: 'Materials', peRatio: 15.8 },
    { ticker: 'TRFX', price: 66.21, change: 2.34, sector: 'Utilities', peRatio: 11.7 },
    { ticker: 'PXNL', price: 15.97, change: -0.12, sector: 'Communication Services', peRatio: 9.8 },
    { ticker: 'AETH', price: 210.43, change: 3.67, sector: 'Consumer Discretionary', peRatio: 27.3 },
    { ticker: 'DRVN', price: 84.56, change: -0.23, sector: 'Industrials', peRatio: 16.5 },
    { ticker: 'SUNR', price: 32.12, change: 1.89, sector: 'Energy', peRatio: 20.1 },
    { ticker: 'MEDX', price: 452.23, change: 2.11, sector: 'Health Care', peRatio: 29.7 },
    { ticker: 'CAPF', price: 110.50, change: -1.45, sector: 'Financials', peRatio: 10.5 },
    { ticker: 'NATF', price: 24.78, change: 0.45, sector: 'Consumer Staples', peRatio: 13.6 },
    { ticker: 'CODE', price: 82.34, change: 3.21, sector: 'Information Technology', peRatio: 28.9 },
    { ticker: 'STEL', price: 47.89, change: -0.56, sector: 'Materials', peRatio: 15.2 },
    { ticker: 'ECOG', price: 54.90, change: 1.87, sector: 'Utilities', peRatio: 12.3 },
    { ticker: 'VIDE', price: 21.45, change: 0.67, sector: 'Communication Services', peRatio: 17.6 },
    { ticker: 'LUXY', price: 315.67, change: 2.45, sector: 'Consumer Discretionary', peRatio: 23.4 },
    { ticker: 'LOGI', price: 67.12, change: 0.98, sector: 'Information Technology', peRatio: 26.7 },
    { ticker: 'SPHR', price: 135.45, change: 1.45, sector: 'Industrials', peRatio: 20.8 },
    { ticker: 'HYDN', price: 39.24, change: -1.12, sector: 'Energy', peRatio: 11.4 },
    { ticker: 'BIOM', price: 268.78, change: 3.45, sector: 'Health Care', peRatio: 24.6 },
    { ticker: 'WLTN', price: 98.45, change: -2.13, sector: 'Financials', peRatio: 9.9 },
    { ticker: 'PURE', price: 56.12, change: 0.32, sector: 'Consumer Staples', peRatio: 18.3 },
    { ticker: 'TECH', price: 145.76, change: 2.67, sector: 'Information Technology', peRatio: 30.0 },
    { ticker: 'GOLD', price: 65.43, change: -0.89, sector: 'Materials', peRatio: 13.5 },
    { ticker: 'WAVE', price: 78.90, change: 1.56, sector: 'Utilities', peRatio: 10.2 },
    { ticker: 'STREAM', price: 34.12, change: 0.78, sector: 'Communication Services', peRatio: 16.4 },
    { ticker: 'FANC', price: 403.21, change: 2.89, sector: 'Consumer Discretionary', peRatio: 28.5 },
    { ticker: 'SKYH', price: 122.78, change: 3.45, sector: 'Industrials', peRatio: 14.7 },
    { ticker: 'WIND', price: 48.34, change: -0.56, sector: 'Energy', peRatio: 19.2 },
    { ticker: 'GENX', price: 372.23, change: 1.98, sector: 'Health Care', peRatio: 21.9 },
    { ticker: 'FINT', price: 140.67, change: -1.34, sector: 'Financials', peRatio: 11.3 },
    { ticker: 'ORGN', price: 62.34, change: 0.21, sector: 'Consumer Staples', peRatio: 17.8 },
    { ticker: 'NETX', price: 178.90, change: 3.12, sector: 'Information Technology', peRatio: 26.4 },
    { ticker: 'BRCK', price: 49.12, change: -1.67, sector: 'Materials', peRatio: 15.5 },
    { ticker: 'AQUA', price: 72.45, change: 2.34, sector: 'Utilities', peRatio: 13.1 },
    { ticker: 'TALK', price: 41.23, change: 1.23, sector: 'Communication Services', peRatio: 12.7 },
    { ticker: 'EXQT', price: 245.78, change: 3.45, sector: 'Consumer Discretionary', peRatio: 27.6 },
    { ticker: 'SYNR', price: 19.89, change: 0.67, sector: 'Utilities', peRatio: 9.2 },
    { ticker: 'XRAY', price: 98.34, change: -0.23, sector: 'Health Care', peRatio: 22.1 },
    { ticker: 'FLOP', price: 56.21, change: 1.09, sector: 'Consumer Staples', peRatio: 13.9 },
    { ticker: 'DINO', price: 27.89, change: -0.67, sector: 'Energy', peRatio: 18.7 },
    { ticker: 'BYTE', price: 210.45, change: 2.45, sector: 'Information Technology', peRatio: 29.4 },
    { ticker: 'COTN', price: 48.67, change: -1.45, sector: 'Materials', peRatio: 15.3 },
    { ticker: 'LITE', price: 29.45, change: 0.34, sector: 'Utilities', peRatio: 10.6 },
    { ticker: 'MOVI', price: 64.34, change: -0.89, sector: 'Communication Services', peRatio: 16.9 },
    { ticker: 'FEVR', price: 341.12, change: 3.67, sector: 'Consumer Discretionary', peRatio: 27.2 },
    { ticker: 'NOVA', price: 112.34, change: 1.34, sector: 'Information Technology', peRatio: 25.6 },
    { ticker: 'BLZE', price: 45.67, change: -0.76, sector: 'Energy', peRatio: 14.8 },
    { ticker: 'PRME', price: 78.23, change: 0.98, sector: 'Health Care', peRatio: 20.7 },
    { ticker: 'ECHO', price: 23.56, change: 2.12, sector: 'Communication Services', peRatio: 11.6 },
    { ticker: 'GRND', price: 98.34, change: -1.45, sector: 'Materials', peRatio: 16.4 },
    { ticker: 'SNAP', price: 143.89, change: 3.56, sector: 'Consumer Discretionary', peRatio: 24.3 },
    { ticker: 'TYPH', price: 67.34, change: -0.34, sector: 'Utilities', peRatio: 10.9 },
    { ticker: 'FLUX', price: 89.12, change: 1.76, sector: 'Industrials', peRatio: 14.5 },
    { ticker: 'STOR', price: 156.78, change: -2.45, sector: 'Real Estate', peRatio: 18.2 },
    { ticker: 'CREE', price: 45.12, change: 0.89, sector: 'Consumer Staples', peRatio: 12.5 },
    { ticker: 'AURA', price: 312.45, change: 1.45, sector: 'Information Technology', peRatio: 26.9 },
    { ticker: 'QUAD', price: 52.89, change: -1.34, sector: 'Financials', peRatio: 10.2 },
    { ticker: 'ZENO', price: 89.67, change: 2.34, sector: 'Health Care', peRatio: 21.4 },
    { ticker: 'PRSM', price: 67.34, change: 0.76, sector: 'Materials', peRatio: 15.9 },
    { ticker: 'BETA', price: 145.67, change: -0.67, sector: 'Communication Services', peRatio: 23.7 },
    { ticker: 'CYBR', price: 210.34, change: 3.12, sector: 'Information Technology', peRatio: 28.3 },
    { ticker: 'FRNT', price: 56.78, change: 0.45, sector: 'Energy', peRatio: 13.6 },
    { ticker: 'GALA', price: 78.45, change: -1.23, sector: 'Utilities', peRatio: 11.8 },
    { ticker: 'NEON', price: 23.67, change: 1.89, sector: 'Consumer Discretionary', peRatio: 17.3 },
    { ticker: 'CLIM', price: 98.45, change: 2.45, sector: 'Industrials', peRatio: 14.2 },
    { ticker: 'SPRK', price: 120.45, change: -1.89, sector: 'Materials', peRatio: 19.4 },
    { ticker: 'ORCA', price: 67.12, change: 0.98, sector: 'Health Care', peRatio: 20.1 },
    { ticker: 'AERO', price: 143.56, change: 2.78, sector: 'Industrials', peRatio: 22.9 },
    { ticker: 'FINN', price: 98.67, change: -0.76, sector: 'Financials', peRatio: 9.7 },
    { ticker: 'VOLT', price: 34.56, change: 1.34, sector: 'Utilities', peRatio: 11.3 },
    { ticker: 'ELEV', price: 56.34, change: -0.98, sector: 'Communication Services', peRatio: 16.5 },
    { ticker: 'CORE', price: 210.78, change: 3.89, sector: 'Information Technology', peRatio: 29.2 },
    { ticker: 'SOLR', price: 76.89, change: 1.56, sector: 'Energy', peRatio: 20.4 },
    { ticker: 'DRGN', price: 145.34, change: -2.34, sector: 'Consumer Discretionary', peRatio: 25.7 },
    { ticker: 'CRWN', price: 56.78, change: 0.98, sector: 'Real Estate', peRatio: 14.9 },
    { ticker: 'PULS', price: 123.45, change: -1.45, sector: 'Industrials', peRatio: 13.8 },
    { ticker: 'LUNA', price: 87.34, change: 2.76, sector: 'Consumer Staples', peRatio: 18.1 },
    { ticker: 'RUSH', price: 45.67, change: 1.89, sector: 'Communication Services', peRatio: 12.4 },
    { ticker: 'HIVE', price: 178.45, change: -0.98, sector: 'Health Care', peRatio: 23.6 },
    { ticker: 'BLNK', price: 64.78, change: 2.34, sector: 'Information Technology', peRatio: 25.9 },
    { ticker: 'CRUX', price: 45.23, change: 0.76, sector: 'Materials', peRatio: 15.6 },
    { ticker: 'WAVE', price: 89.34, change: -1.45, sector: 'Utilities', peRatio: 10.8 },
    { ticker: 'ARCH', price: 134.78, change: 2.12, sector: 'Consumer Discretionary', peRatio: 24.8 },
    { ticker: 'ZENI', price: 78.12, change: -0.34, sector: 'Industrials', peRatio: 13.4 },
    { ticker: 'GLXY', price: 56.45, change: 1.45, sector: 'Energy', peRatio: 12.9 },
    { ticker: 'BOND', price: 67.89, change: 0.67, sector: 'Financials', peRatio: 9.5 },
    { ticker: 'ALTN', price: 98.23, change: 1.89, sector: 'Health Care', peRatio: 21.7 },
    { ticker: 'FOXD', price: 123.45, change: -1.67, sector: 'Communication Services', peRatio: 16.8 },
    { ticker: 'JUMP', price: 89.67, change: 2.34, sector: 'Consumer Discretionary', peRatio: 22.5 },
    { ticker: 'QUAK', price: 56.23, change: 0.76, sector: 'Real Estate', peRatio: 14.3 },
    { ticker: 'FLASH', price: 78.89, change: -0.98, sector: 'Information Technology', peRatio: 26.5 },
    { ticker: 'FUME', price: 145.34, change: 2.45, sector: 'Industrials', peRatio: 19.8 },
    { ticker: 'WIND', price: 76.12, change: -1.12, sector: 'Utilities', peRatio: 11.1 },
    { ticker: 'RADI', price: 210.56, change: 3.12, sector: 'Energy', peRatio: 29.0 },
    { ticker: 'GLOO', price: 89.45, change: 1.78, sector: 'Materials', peRatio: 14.1 },
    { ticker: 'ORBT', price: 102.34, change: 2.12, sector: 'Information Technology', peRatio: 27.6 },
    { ticker: 'GASP', price: 38.56, change: -0.98, sector: 'Energy', peRatio: 12.4 },
    { ticker: 'HARM', price: 312.45, change: 1.78, sector: 'Health Care', peRatio: 23.9 },
    { ticker: 'ZAPP', price: 27.67, change: 3.45, sector: 'Communication Services', peRatio: 17.2 },
    { ticker: 'MINR', price: 67.89, change: -1.45, sector: 'Materials', peRatio: 15.4 },
    { ticker: 'LUXR', price: 198.56, change: 2.98, sector: 'Consumer Discretionary', peRatio: 24.6 },
    { ticker: 'ELEC', price: 54.34, change: 0.45, sector: 'Utilities', peRatio: 11.5 },
    { ticker: 'XACT', price: 176.45, change: -2.34, sector: 'Industrials', peRatio: 14.9 },
    { ticker: 'BLOC', price: 87.12, change: 1.76, sector: 'Real Estate', peRatio: 13.7 },
    { ticker: 'GRNV', price: 123.45, change: 2.34, sector: 'Consumer Staples', peRatio: 19.8 },
    { ticker: 'FIRM', price: 98.12, change: -0.98, sector: 'Financials', peRatio: 10.3 },
    { ticker: 'KYTE', price: 56.78, change: 1.89, sector: 'Energy', peRatio: 13.2 },
    { ticker: 'PLAS', price: 87.34, change: 0.56, sector: 'Materials', peRatio: 14.5 },
    { ticker: 'INVO', price: 143.23, change: -1.12, sector: 'Industrials', peRatio: 21.2 },
    { ticker: 'RAZE', price: 67.45, change: 2.76, sector: 'Utilities', peRatio: 10.6 },
    { ticker: 'BEAC', price: 212.34, change: 3.56, sector: 'Information Technology', peRatio: 27.8 },
    { ticker: 'GENE', price: 78.23, change: 0.98, sector: 'Health Care', peRatio: 20.9 },
    { ticker: 'SAND', price: 45.34, change: -0.78, sector: 'Communication Services', peRatio: 15.1 },
    { ticker: 'WELD', price: 123.89, change: 1.45, sector: 'Materials', peRatio: 18.3 },
    { ticker: 'RISE', price: 89.67, change: 2.45, sector: 'Consumer Discretionary', peRatio: 22.4 },
    { ticker: 'CRED', price: 67.34, change: -1.23, sector: 'Financials', peRatio: 9.8 },
    { ticker: 'FLIT', price: 54.78, change: 0.76, sector: 'Utilities', peRatio: 12.7 },
    { ticker: 'LAVA', price: 98.45, change: 2.98, sector: 'Energy', peRatio: 21.5 },
    { ticker: 'SPIN', price: 176.23, change: -1.67, sector: 'Industrials', peRatio: 14.4 },
    { ticker: 'NOVA', price: 56.34, change: 1.56, sector: 'Real Estate', peRatio: 16.8 },
    { ticker: 'SOLN', price: 123.78, change: 3.45, sector: 'Consumer Staples', peRatio: 18.6 },
    { ticker: 'CLAR', price: 87.12, change: 0.98, sector: 'Health Care', peRatio: 21.1 },
    { ticker: 'WATT', price: 67.45, change: -0.67, sector: 'Information Technology', peRatio: 25.3 },
    { ticker: 'VEST', price: 54.67, change: 2.34, sector: 'Financials', peRatio: 10.1 },
    { ticker: 'ALFA', price: 89.34, change: -1.12, sector: 'Consumer Discretionary', peRatio: 19.7 },
    { ticker: 'HEAT', price: 176.45, change: 1.89, sector: 'Energy', peRatio: 22.8 },
    { ticker: 'LOOP', price: 45.78, change: 2.56, sector: 'Communication Services', peRatio: 17.5 },
    { ticker: 'ECHO', price: 143.12, change: -2.34, sector: 'Industrials', peRatio: 12.9 },
    { ticker: 'SHLD', price: 67.89, change: 0.76, sector: 'Materials', peRatio: 14.8 },
    { ticker: 'TORN', price: 212.34, change: 3.12, sector: 'Information Technology', peRatio: 28.7 },
    { ticker: 'CUBE', price: 78.45, change: -0.98, sector: 'Real Estate', peRatio: 13.4 },
    { ticker: 'CYCL', price: 54.89, change: 1.23, sector: 'Utilities', peRatio: 11.2 },
    { ticker: 'GIGA', price: 98.34, change: 2.78, sector: 'Energy', peRatio: 19.5 },
    { ticker: 'VORT', price: 123.45, change: -1.45, sector: 'Health Care', peRatio: 20.6 },
    { ticker: 'POND', price: 67.34, change: 1.76, sector: 'Consumer Staples', peRatio: 16.9 },
    { ticker: 'HARM', price: 143.67, change: 3.98, sector: 'Consumer Discretionary', peRatio: 25.1 },
    { ticker: 'FUEL', price: 87.89, change: -2.34, sector: 'Industrials', peRatio: 13.1 },
    { ticker: 'WAVE', price: 176.45, change: 1.56, sector: 'Utilities', peRatio: 10.5 },
    { ticker: 'BOLT', price: 98.12, change: 0.45, sector: 'Energy', peRatio: 15.7 },
    { ticker: 'LIFT', price: 123.78, change: -1.12, sector: 'Communication Services', peRatio: 17.8 },
    { ticker: 'ELEV', price: 78.34, change: 2.89, sector: 'Materials', peRatio: 14.3 },
    { ticker: 'GRIP', price: 54.45, change: -0.76, sector: 'Financials', peRatio: 10.7 },
    { ticker: 'ZONE', price: 212.34, change: 3.56, sector: 'Real Estate', peRatio: 22.5 },
    { ticker: 'CONE', price: 67.78, change: 1.12, sector: 'Information Technology', peRatio: 26.8 },
];




let newsData = require('./news.json');
let globalNewsData = require('./globalNews.json');
let sectorNewsData = require('./sectorNews.json');

const globalSensitivity = 0.1;
const sectorSensivity = 0.6;
const sensitivity = 0.72;
let marketSentiment = 0; 
let currentNews = null; 
const tradeWindow = 1000; // 30 seconds 

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

function getGlobalNews() {
    if (globalNewsData.length === 0) {
        console.error('No global news data available');
        return null;
    }
    return globalNewsData[Math.floor(Math.random() * globalNewsData.length)];

}

function getSectorNews() {
    const sectors = Object.keys(sectorNewsData.sectors);

    if (sectors.length === 0) {
        console.error('No sector data available.');
        return null;
    }


    const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
    const sectorNews = sectorNewsData.sectors[randomSector];

    if (!sectorNews || sectorNews.length === 0) {
        console.error(`No news data available for sector: ${randomSector}`);
        return null;
    }


    const randomNews = sectorNews[Math.floor(Math.random() * sectorNews.length)];
    console.log(randomNews);
    return {
        ...randomNews,
        sector: randomSector
    };
}

function applyImpactToStocks(newsItem, stocks, sensitivity) {
    // Determine affected stocks based on the news type
    const affectedStocks = newsItem.ticker
        ? stocks.filter((stock) => stock.ticker === newsItem.ticker)
        : newsItem.sector
        ? stocks.filter((stock) => stock.sector === newsItem.sector)
        : stocks;

    // Apply impact to each affected stock
    affectedStocks.forEach((stock) => {
        marketSentiment = (Math.random() - 0.5) * 2; // Random sentiment between -1 and 1

        // Calculate price change due to news and market sentiment
        const sentimentImpact = (marketSentiment * sensitivity) / 100 * stock.price;
        const newsImpact = (newsItem.sentimentScore * sensitivity) / 100 * stock.price;
        const totalImpact = newsImpact + sentimentImpact;

        // Update stock price and history
        const newPrice = parseFloat((stock.price + totalImpact).toFixed(2));
        stock.price = newPrice;

        if (stock.history[stock.history.length - 1] !== newPrice) {
            stock.history.push(newPrice);
        }
        if (stock.history.length > 30) {
            stock.history.shift();
        }

        // Update stock change percentage
        const previousPrice = stock.history[stock.history.length - 2] || stock.price;
        stock.change = parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));
    });
}


function updateAppState() {
    const currentNewsItems = [];

    // Global News
    const globalNews = getGlobalNews();
    if (globalNews) {
        currentNewsItems.push({
            type: 'global',
            description: globalNews.description,
            sentimentScore: globalNews.sentimentScore,
        });
        applyImpactToStocks(globalNews, stocks, globalSensitivity);
    }


    // Sector News
    const sectorNews = getSectorNews();
    if (sectorNews && sectorNews.sector) {
        currentNewsItems.push({
            type: 'sector',
            sector: sectorNews.sector,
            description: sectorNews.description,
            sentimentScore: sectorNews.sentimentScore,
        });
        applyImpactToStocks(sectorNews, stocks, sectorSensivity);
    }

    // Stock-Specific News
    const stockSpecificNews = getRandomNews();
    if (stockSpecificNews && stockSpecificNews.ticker) {
        currentNewsItems.push({
            type: 'stock',
            ticker: stockSpecificNews.ticker,
            description: stockSpecificNews.description,
            sentimentScore: stockSpecificNews.sentimentScore,
        });
        applyImpactToStocks(stockSpecificNews, stocks, sensitivity);
    }

    // Update the global current news state
    currentNews = currentNewsItems;

    console.log('App state updated with news:', currentNews);
}


// Periodically fetch new news and apply impact
setInterval(() => {
    updateAppState();
}, tradeWindow); // Refresh every 30 seconds

// API Endpoints
app.get('/api/stocks', (req, res) => {
  //  console.log("GET /api/stocks CALLED");
    res.json(stocks);
});

app.get('/api/news', (req, res) => {
   // console.log("GET /api/news CALLED");
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
app.get('/api/market-sentiment', (req, res) => {
   // console.log("GET /api/market-sentiment CALLED");
    res.json(marketSentiment);
});
app.get('/api/balance', (req, res) => {
   // console.log("GET /api/balance CALLED");
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
app.post('/api/sync-shares', (req, res) => {
    console.log('Incoming sync request:', req.body);

    const { ownedShares } = req.body;

    if (!ownedShares || typeof ownedShares !== 'object') {
        console.error('Invalid owned shares data:', req.body);
        return res.status(400).json({ error: 'Invalid owned shares data' });
    }

    try {
        Object.keys(ownedShares).forEach((ticker) => {
            ownedShares[ticker] = ownedShares[ticker];
        });

        console.log('Owned shares after sync:', ownedShares);
        res.status(200).json({ message: 'Owned shares synced successfully' });
    } catch (error) {
        console.error('Error syncing owned shares:', error.message);
        res.status(500).json({ error: 'Failed to sync owned shares' });
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});