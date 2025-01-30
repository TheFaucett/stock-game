const express = require('express');
const cors = require('cors');


const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);




const app = express();
const PORT = 5000;

const userPortfolio = {
    balance: 10000,
    transactions: [],
    ownedShares: {}, // { ticker: sharesOwned }
};

// Enable CORS so frontend can access backend
app.use(cors());
app.use(express.json()); // Enable JSON body parsing
// Simple route to send a message
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});


const stocks = [
    { ticker: 'ASTC', price: 153.42, change: 2.45, sector: 'Industrials', eps: 8.29, outstandingShares: 50_000_000 },
    { ticker: 'GRBX', price: 27.85, change: -0.32, sector: 'Energy', eps: 1.95, outstandingShares: 120_000_000 },
    { ticker: 'HMTL', price: 345.68, change: 1.12, sector: 'Health Care', eps: 15.23, outstandingShares: 25_000_000 },
    { ticker: 'FNXY', price: 92.30, change: -1.67, sector: 'Financials', eps: 7.16, outstandingShares: 75_000_000 },
    { ticker: 'CNTK', price: 18.45, change: 0.56, sector: 'Consumer Staples', eps: 0.97, outstandingShares: 200_000_000 },
    { ticker: 'GLMT', price: 57.19, change: 1.03, sector: 'Information Technology', eps: 2.25, outstandingShares: 150_000_000 },
    { ticker: 'VTRD', price: 42.76, change: -0.78, sector: 'Materials', eps: 2.71, outstandingShares: 85_000_000 },
    { ticker: 'TRFX', price: 66.21, change: 2.34, sector: 'Utilities', eps: 5.66, outstandingShares: 90_000_000 },
    { ticker: 'PXNL', price: 15.97, change: -0.12, sector: 'Communication Services', eps: 1.63, outstandingShares: 300_000_000 },
    { ticker: 'AETH', price: 210.43, change: 3.67, sector: 'Consumer Discretionary', eps: 7.71, outstandingShares: 40_000_000 },
    { ticker: 'DRVN', price: 84.56, change: -0.23, sector: 'Industrials', eps: 5.12, outstandingShares: 100_000_000 },
    { ticker: 'SUNR', price: 32.12, change: 1.89, sector: 'Energy', eps: 1.60, outstandingShares: 220_000_000 },
    { ticker: 'MEDX', price: 452.23, change: 2.11, sector: 'Health Care', eps: 15.23, outstandingShares: 18_000_000 },
    { ticker: 'CAPF', price: 110.50, change: -1.45, sector: 'Financials', eps: 10.52, outstandingShares: 60_000_000 },
    { ticker: 'NATF', price: 24.78, change: 0.45, sector: 'Consumer Staples', eps: 1.82, outstandingShares: 190_000_000 },
    { ticker: 'CODE', price: 82.34, change: 3.21, sector: 'Information Technology', eps: 2.85, outstandingShares: 130_000_000 },
    { ticker: 'STEL', price: 47.89, change: -0.56, sector: 'Materials', eps: 3.15, outstandingShares: 95_000_000 },
    { ticker: 'ECOG', price: 54.90, change: 1.87, sector: 'Utilities', eps: 4.46, outstandingShares: 140_000_000 },
    { ticker: 'VIDE', price: 21.45, change: 0.67, sector: 'Communication Services', eps: 1.22, outstandingShares: 280_000_000 },
    { ticker: 'LUXY', price: 315.67, change: 2.45, sector: 'Consumer Discretionary', eps: 13.49, outstandingShares: 30_000_000 },
    { ticker: 'LOGI', price: 67.12, change: 0.98, sector: 'Information Technology', eps: 2.51, outstandingShares: 120_000_000 },
    { ticker: 'SPHR', price: 135.45, change: 1.45, sector: 'Industrials', eps: 6.51, outstandingShares: 80_000_000 },
    { ticker: 'HYDN', price: 39.24, change: -1.12, sector: 'Energy', eps: 3.44, outstandingShares: 190_000_000 },
    { ticker: 'BIOM', price: 268.78, change: 3.45, sector: 'Health Care', eps: 10.93, outstandingShares: 22_000_000 },
    { ticker: 'WLTN', price: 98.45, change: -2.13, sector: 'Financials', eps: 9.94, outstandingShares: 50_000_000 },
    { ticker: 'PURE', price: 56.12, change: 0.32, sector: 'Consumer Staples', eps: 3.07, outstandingShares: 180_000_000 },
    { ticker: 'TECH', price: 145.76, change: 2.67, sector: 'Information Technology', eps: 4.86, outstandingShares: 95_000_000 },
    { ticker: 'GOLD', price: 65.43, change: -0.89, sector: 'Materials', eps: 4.85, outstandingShares: 70_000_000 },
    { ticker: 'STREAM', price: 34.12, change: 0.78, sector: 'Communication Services', eps: 2.08, outstandingShares: 250_000_000 },
    { ticker: 'FANC', price: 403.21, change: 2.89, sector: 'Consumer Discretionary', eps: 14.15, outstandingShares: 15_000_000 },
    { ticker: 'SKYH', price: 122.78, change: 3.45, sector: 'Industrials', eps: 8.35, outstandingShares: 65_000_000 },
    { ticker: 'WIND', price: 48.34, change: -0.56, sector: 'Energy', eps: 2.52, outstandingShares: 230_000_000 },
    { ticker: 'GENX', price: 372.23, change: 1.98, sector: 'Health Care', eps: 17.01, outstandingShares: 12_000_000 },
    { ticker: 'FINT', price: 140.67, change: -1.34, sector: 'Financials', eps: 12.45, outstandingShares: 55_000_000 },
    { ticker: 'ORGN', price: 62.34, change: 0.21, sector: 'Consumer Staples', eps: 3.50, outstandingShares: 170_000_000 },
    { ticker: 'NETX', price: 178.90, change: 3.12, sector: 'Information Technology', eps: 6.78, outstandingShares: 75_000_000 },
    { ticker: 'BRCK', price: 49.12, change: -1.67, sector: 'Materials', eps: 3.17, outstandingShares: 85_000_000 },
    { ticker: 'AQUA', price: 72.45, change: 2.34, sector: 'Utilities', eps: 5.53, outstandingShares: 110_000_000 },
    { ticker: 'TALK', price: 41.23, change: 1.23, sector: 'Communication Services', eps: 3.25, outstandingShares: 240_000_000 },
    { ticker: 'BYTE', price: 210.45, change: 2.45, sector: 'Information Technology', eps: 7.16, outstandingShares: 30_000_000 },
    { ticker: 'COTN', price: 48.67, change: -1.45, sector: 'Materials', eps: 3.18, outstandingShares: 100_000_000 },
    { ticker: 'LITE', price: 29.45, change: 0.34, sector: 'Utilities', eps: 2.78, outstandingShares: 220_000_000 },
    { ticker: 'MOVI', price: 64.34, change: -0.89, sector: 'Communication Services', eps: 3.81, outstandingShares: 210_000_000 },
    { ticker: 'FEVR', price: 341.12, change: 3.67, sector: 'Consumer Discretionary', eps: 12.54, outstandingShares: 20_000_000 },
    { ticker: 'BLZE', price: 45.67, change: -0.76, sector: 'Energy', eps: 3.09, outstandingShares: 160_000_000 },
    { ticker: 'PRME', price: 78.23, change: 0.98, sector: 'Health Care', eps: 3.78, outstandingShares: 140_000_000 },
    { ticker: 'GRND', price: 98.34, change: -1.45, sector: 'Materials', eps: 6.00, outstandingShares: 55_000_000 },
    { ticker: 'SNAP', price: 143.89, change: 3.56, sector: 'Consumer Discretionary', eps: 5.92, outstandingShares: 45_000_000 },
    { ticker: 'TYPH', price: 67.34, change: -0.34, sector: 'Utilities', eps: 6.18, outstandingShares: 130_000_000 },
    { ticker: 'FLUX', price: 89.12, change: 1.76, sector: 'Industrials', eps: 6.15, outstandingShares: 100_000_000 },
    { ticker: 'STOR', price: 156.78, change: -2.45, sector: 'Real Estate', eps: 8.61, outstandingShares: 50_000_000 },
    { ticker: 'CREE', price: 45.12, change: 0.89, sector: 'Consumer Staples', eps: 3.61, outstandingShares: 160_000_000 },
    { ticker: 'AURA', price: 312.45, change: 1.45, sector: 'Information Technology', eps: 11.61, outstandingShares: 22_000_000 },
    { ticker: 'QUAD', price: 52.89, change: -1.34, sector: 'Financials', eps: 5.18, outstandingShares: 80_000_000 },
    { ticker: 'ZENO', price: 89.67, change: 2.34, sector: 'Health Care', eps: 4.19, outstandingShares: 100_000_000 },
    { ticker: 'PRSM', price: 67.34, change: 0.76, sector: 'Materials', eps: 4.24, outstandingShares: 85_000_000 },
    { ticker: 'BETA', price: 145.67, change: -0.67, sector: 'Communication Services', eps: 6.14, outstandingShares: 125_000_000 },
    { ticker: 'CYBR', price: 210.34, change: 3.12, sector: 'Information Technology', eps: 7.43, outstandingShares: 25_000_000 },
    { ticker: 'FRNT', price: 56.78, change: 0.45, sector: 'Energy', eps: 4.18, outstandingShares: 190_000_000 },
    { ticker: 'GALA', price: 78.45, change: -1.23, sector: 'Utilities', eps: 6.64, outstandingShares: 150_000_000 },
    { ticker: 'NEON', price: 23.67, change: 1.89, sector: 'Consumer Discretionary', eps: 1.37, outstandingShares: 310_000_000 },
    { ticker: 'CLIM', price: 98.45, change: 2.45, sector: 'Industrials', eps: 6.93, outstandingShares: 65_000_000 },
    { ticker: 'SPRK', price: 120.45, change: -1.89, sector: 'Materials', eps: 6.21, outstandingShares: 70_000_000 },
    { ticker: 'ORCA', price: 67.12, change: 0.98, sector: 'Health Care', eps: 3.34, outstandingShares: 90_000_000 },
    { ticker: 'AERO', price: 143.56, change: 2.78, sector: 'Industrials', eps: 6.27, outstandingShares: 55_000_000 },
    { ticker: 'FINN', price: 98.67, change: -0.76, sector: 'Financials', eps: 10.17, outstandingShares: 45_000_000 },
    { ticker: 'VOLT', price: 34.56, change: 1.34, sector: 'Utilities', eps: 3.06, outstandingShares: 200_000_000 },
    { ticker: 'CORE', price: 210.78, change: 3.89, sector: 'Information Technology', eps: 7.22, outstandingShares: 25_000_000 },
    { ticker: 'SOLR', price: 76.89, change: 1.56, sector: 'Energy', eps: 3.77, outstandingShares: 110_000_000 },
    { ticker: 'DRGN', price: 145.34, change: -2.34, sector: 'Consumer Discretionary', eps: 5.65, outstandingShares: 35_000_000 },
    { ticker: 'CRWN', price: 56.78, change: 0.98, sector: 'Real Estate', eps: 3.81, outstandingShares: 130_000_000 },
    { ticker: 'PULS', price: 123.45, change: -1.45, sector: 'Industrials', eps: 8.95, outstandingShares: 50_000_000 },
    { ticker: 'LUNA', price: 87.34, change: 2.76, sector: 'Consumer Staples', eps: 4.83, outstandingShares: 140_000_000 },
    { ticker: 'RUSH', price: 45.67, change: 1.89, sector: 'Communication Services', eps: 3.68, outstandingShares: 260_000_000 },
    { ticker: 'HIVE', price: 178.45, change: -0.98, sector: 'Health Care', eps: 7.56, outstandingShares: 20_000_000 },
    { ticker: 'BLNK', price: 64.78, change: 2.34, sector: 'Information Technology', eps: 2.50, outstandingShares: 160_000_000 },
    { ticker: 'CRUX', price: 45.23, change: 0.76, sector: 'Materials', eps: 2.90, outstandingShares: 110_000_000 },
    { ticker: 'WAVE', price: 89.34, change: -1.45, sector: 'Utilities', eps: 8.27, outstandingShares: 120_000_000 },
    { ticker: 'ARCH', price: 134.78, change: 2.12, sector: 'Consumer Discretionary', eps: 5.44, outstandingShares: 40_000_000 },
    { ticker: 'ZENI', price: 78.12, change: -0.34, sector: 'Industrials', eps: 5.83, outstandingShares: 90_000_000 },
    { ticker: 'GLXY', price: 56.45, change: 1.45, sector: 'Energy', eps: 4.38, outstandingShares: 180_000_000 },
    { ticker: 'BOND', price: 67.89, change: 0.67, sector: 'Financials', eps: 7.14, outstandingShares: 70_000_000 },
    { ticker: 'ALTN', price: 98.23, change: 1.89, sector: "Health Care", eps: 4.53, outstandingShares: 150000000 },
    { ticker: 'FOXD', price: 123.45, change: -1.67, sector: "Communication Services", eps: 7.35, outstandingShares: 250000000 },
    { ticker: 'JUMP', price: 89.67, change: 2.34, sector: "Consumer Discretionary", eps: 3.96, outstandingShares: 100000000 },
    { ticker: 'QUAK', price: 56.23, change: 0.76, sector: "Real Estate", eps: 3.93, outstandingShares: 80000000 },
    { ticker: 'FLASH', price: 78.89, change: -0.98, sector: "Information Technology", eps: 2.97, outstandingShares: 200000000 },
    { ticker: 'FUME', price: 145.34, change: 2.45, sector: "Industrials", eps: 7.34, outstandingShares: 50000000 },
    { ticker: 'RADI', price: 210.56, change: 3.12, sector: "Energy", eps: 6.67, outstandingShares: 40000000 },
    { ticker: 'GLOO', price: 89.45, change: 1.78, sector: "Materials", eps: 6.11, outstandingShares: 100000000 },
    { ticker: 'ORBT', price: 102.34, change: 2.12, sector: "Information Technology", eps: 6.35, outstandingShares: 150000000 },
    { ticker: 'GASP', price: 38.56, change: -0.98, sector: "Energy", eps: 3.11, outstandingShares: 180000000 },
    { ticker: 'HARM', price: 312.45, change: 1.78, sector: "Health Care", eps: 13.08, outstandingShares: 30000000 },
    { ticker: 'ZAPP', price: 27.67, change: 3.45, sector: "Communication Services", eps: 1.61, outstandingShares: 220000000 },
    { ticker: 'MINR', price: 67.89, change: -1.45, sector: "Materials", eps: 4.40, outstandingShares: 75000000 },
    { ticker: 'LUXR', price: 198.56, change: 2.98, sector: "Consumer Discretionary", eps: 8.19, outstandingShares: 40000000 },
    { ticker: 'ELEC', price: 54.34, change: 0.45, sector: "Utilities", eps: 4.73, outstandingShares: 100000000 },
    { ticker: 'XACT', price: 176.45, change: -2.34, sector: "Industrials", eps: 11.83, outstandingShares: 45000000 },
    { ticker: 'BLOC', price: 87.12, change: 1.76, sector: "Real Estate", eps: 6.36, outstandingShares: 85000000 },
    { ticker: 'GRNV', price: 123.45, change: 2.34, sector: "Consumer Staples", eps: 6.23, outstandingShares: 90000000 },
    { ticker: 'FIRM', price: 98.12, change: -0.98, sector: "Financials", eps: 7.32, outstandingShares: 110000000 },
    { ticker: 'KYTE', price: 56.78, change: 1.89, sector: "Energy", eps: 4.30, outstandingShares: 160000000 },
    { ticker: 'PLAS', price: 87.34, change: 0.56, sector: "Materials", eps: 6.02, outstandingShares: 120000000 },
    { ticker: 'INVO', price: 143.23, change: -1.12, sector: "Industrials", eps: 6.76, outstandingShares: 70000000 },
    { ticker: 'RAZE', price: 67.45, change: 2.76, sector: "Utilities", eps: 5.87, outstandingShares: 95000000 },
    { ticker: 'BEAC', price: 212.34, change: 3.56, sector: "Information Technology", eps: 7.64, outstandingShares: 50000000 },
    { ticker: 'GENE', price: 78.23, change: 0.98, sector: "Health Care", eps: 3.74, outstandingShares: 180000000 },
    { ticker: 'SAND', price: 45.34, change: -0.78, sector: "Communication Services", eps: 3.02, outstandingShares: 220000000 },
    { ticker: 'WELD', price: 123.89, change: 1.45, sector: "Materials", eps: 6.77, outstandingShares: 95000000 },
    { ticker: 'RISE', price: 89.67, change: 2.45, sector: "Consumer Discretionary", eps: 4.01, outstandingShares: 80000000 },
    { ticker: 'CRED', price: 67.34, change: -1.23, sector: "Financials", eps: 6.88, outstandingShares: 110000000 },
    { ticker: 'FLIT', price: 54.78, change: 0.76, sector: "Utilities", eps: 4.28, outstandingShares: 130000000 },
    { ticker: 'LAVA', price: 98.45, change: 2.98, sector: "Energy", eps: 4.58, outstandingShares: 140000000 },
    { ticker: 'SPIN', price: 176.23, change: -1.67, sector: "Industrials", eps: 12.23, outstandingShares: 60000000 },
    { ticker: 'NOVA', price: 56.34, change: 1.56, sector: "Real Estate", eps: 3.35, outstandingShares: 85000000 },
    { ticker: 'SOLN', price: 123.78, change: 3.45, sector: "Consumer Staples", eps: 6.65, outstandingShares: 95000000 },
    { ticker: 'CLAR', price: 87.12, change: 0.98, sector: "Health Care", eps: 4.13, outstandingShares: 180000000 },
    { ticker: 'WATT', price: 67.45, change: -0.67, sector: "Information Technology", eps: 2.67, outstandingShares: 200000000 },
    { ticker: 'VEST', price: 54.67, change: 2.34, sector: "Financials", eps: 5.87, outstandingShares: 110000000 },
    { ticker: 'ALFA', price: 89.34, change: -1.12, sector: "Consumer Discretionary", eps: 7.78, outstandingShares: 70000000 },
    { ticker: 'HEAT', price: 176.45, change: 1.89, sector: "Energy", eps: 4.51, outstandingShares: 45000000 },
    { ticker: 'LOOP', price: 45.78, change: 2.56, sector: "Communication Services", eps: 3.02, outstandingShares: 220000000 },
    { ticker: 'ECHO', price: 143.12, change: -2.34, sector: "Industrials", eps: 6.78, outstandingShares: 80000000 },
    { ticker: 'SHLD', price: 67.89, change: 0.76, sector: "Materials", eps: 5.83, outstandingShares: 100000000 },
    { ticker: 'TORN', price: 212.34, change: 3.12, sector: "Information Technology", eps: 7.40, outstandingShares: 50000000 },
    { ticker: 'CUBE', price: 78.45, change: -0.98, sector: "Real Estate", eps: 5.80, outstandingShares: 90000000 },
    { ticker: 'CYCL', price: 54.89, change: 1.23, sector: "Utilities", eps: 5.08, outstandingShares: 110000000 },
    { ticker: 'GIGA', price: 98.34, change: 2.78, sector: "Energy", eps: 5.41, outstandingShares: 60000000 },
    { ticker: 'VORT', price: 123.45, change: -1.45, sector: "Health Care", eps: 7.62, outstandingShares: 45000000 },
    { ticker: 'POND', price: 67.34, change: 1.76, sector: "Consumer Staples", eps: 3.83, outstandingShares: 110000000 },
    { ticker: 'FUEL', price: 87.89, change: -2.34, sector: "Industrials", eps: 5.34, outstandingShares: 75000000 },
    { ticker: 'BOLT', price: 98.12, change: 0.45, sector: "Energy", eps: 4.21, outstandingShares: 160000000 },
    { ticker: 'LIFT', price: 123.78, change: -1.12, sector: "Communication Services", eps: 6.95, outstandingShares: 150000000 },
    { ticker: 'ELEV', price: 78.34, change: 2.89, sector: "Materials", eps: 4.89, outstandingShares: 90000000 },
    { ticker: 'GRIP', price: 54.45, change: -0.76, sector: "Financials", eps: 3.67, outstandingShares: 110000000 },
    { ticker: 'ZONE', price: 212.34, change: 3.56, sector: "Real Estate", eps: 6.93, outstandingShares: 50000000 },
    { ticker: 'CONE', price: 67.78, change: 1.12, sector: "Information Technology", eps: 6.97, outstandingShares: 140000000 }
];

stocks.forEach((stock) => {
    stock.peRatio = (stock.price / stock.eps).toFixed(2);
    stock.dividendYield = (stock.eps * 0.4) / stock.price; //using 40% as a payout ratio
});

let newsData = require('./news.json');
let globalNewsData = require('./globalNews.json');
let sectorNewsData = require('./sectorNews.json');



weights = {
    global: 0.2,
    sector: 0.3,
    stock: 0.5
};
let marketSentiment = 0; 

let pastNews = [];
let currentNews = null; 
const tradeWindow = 1000; // 30 seconds 


let currentDate = new Date();

function startTradingDay() {
    stocks.forEach((stock) => {
        stock.openPrice = stock.price;
        stock.highPrice = stock.price;
        stock.lowPrice = stock.price;
    });

}


function endTradingDay() {
    stocks.forEach((stock) => {
        stock.closePrice = stock.price;
    });


}


function newDay() {
    endTradingDay();
    currentDate.setDate(currentDate.getDate() + 1);
    startTradingDay();
}
startTradingDay();

let marketIndex = 0;
let initialIndex = 0;

function calculateMarketIndex() {
    if (stocks.length === 0) return 0;

    const totalPrice = stocks.reduce((sum, stock) => {
        if (isNaN(stock.price)) {
            console.error("Invalid stock price detected:", stock);
            return sum;
        }
        return sum + stock.price;
    }, 0);

    marketIndex = totalPrice / stocks.length;

    if (isNaN(marketIndex)) {
        console.error("Market index calculation failed. Total price:", totalPrice);
        return;
    }

    if (initialIndex === 0) initialIndex = marketIndex;

    return marketIndex;
}





function getIndexPerformance() {
// where performance is a percentage
    if (initialIndex === 0) return 0;
    return ((marketIndex - initialIndex) / initialIndex) * 100;
}

function distributeDividends() {
    const dividendRecords = [];

    for (const stock of stocks) {
        if (!stock.dividendYield) continue; // Skip stocks without dividends

        const dividendPerShare = (stock.dividendYield / 100) * stock.price;
      //  console.log("DEBUG SIGNAL: ", userPortfolio.ownedShares);
        for (const [ticker, sharesOwned] of Object.entries(userPortfolio.ownedShares)) {
            if (ticker === stock.ticker) {
                const dividend = sharesOwned * dividendPerShare;
                userPortfolio.balance += dividend;
                dividendRecords.push({
                    ticker,
                    sharesOwned,
                    dividendPerShare: dividendPerShare.toFixed(2),
                    totalDividend: dividend.toFixed(2),
                    date: new Date().toISOString(),
                });
            }
        }
    }

    console.log('Dividends distributed:', dividendRecords);
    return dividendRecords;
}

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

function applyImpactToStocks(newsItem, stocks, weight, ) {
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
        const sentimentImpact = (marketSentiment) / 100 * stock.price;
        const newsImpact = (newsItem.sentimentScore * weight ) / 100 * stock.price;
        const totalImpact = newsImpact + sentimentImpact;

        // Update stock price and history
        const newPrice = parseFloat((stock.price + totalImpact).toFixed(2));
        stock.price = newPrice;

        stock.highPrice = Math.max(stock.highPrice, stock.price);
        stock.lowPrice = Math.min(stock.lowPrice, stock.price);



        if (stock.history[stock.history.length - 1] !== newPrice) {
            stock.history.push(newPrice);
        }
        if (stock.history.length > 30) {
            stock.history.shift();
        }
        if (userPortfolio.ownedShares[stock.ticker]) {
            const newValue = userPortfolio.ownedShares[stock.ticker] * stock.price;
            console.log(`Portfolio value for ${stock.ticker} updated to $${newValue.toFixed(2)}`);
        }
        // Update stock change percentage
        const previousPrice = stock.history[stock.history.length - 2] || stock.price;
        stock.change = parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));
        calculateMarketIndex();
    });
}


function updateAppState() {
    const currentNewsItems = [];

    // Process global news
    const globalNews = getGlobalNews();
    if (globalNews) {
        currentNewsItems.push({
            type: "global",
            description: globalNews.description,
            sentimentScore: globalNews.sentimentScore,
        });
        applyImpactToStocks(globalNews, stocks, weights.global);

    }

    // Process sector news
    const sectorNews = getSectorNews();
    if (sectorNews && sectorNews.sector) {
        currentNewsItems.push({
            type: "sector",
            sector: sectorNews.sector,
            description: sectorNews.description,
            sentimentScore: sectorNews.sentimentScore,
        });
        applyImpactToStocks(sectorNews, stocks, weights.sector);


    }

    // Process stock-specific news
    const stockSpecificNews = getRandomNews();
    if (stockSpecificNews && stockSpecificNews.ticker) {
        currentNewsItems.push({
            type: "stock",
            ticker: stockSpecificNews.ticker,
            description: stockSpecificNews.description,
            sentimentScore: stockSpecificNews.sentimentScore,
        });
        applyImpactToStocks(stockSpecificNews, stocks, weights.stock);


    }

    pastNews = [...pastNews, ...currentNewsItems];
    if (pastNews.length > 100) {
        pastNews.slice(100);
    }
    // Update the current news
    currentNews = currentNewsItems;

    console.log("App state updated with news:", currentNews);
}



setInterval(() => {
    updateAppState();
}, tradeWindow); 

setInterval(() => {
    distributeDividends();
}, tradeWindow * 10); // 

setInterval(() => {
    newDay();

}, tradeWindow ); 

app.get('/api/portfolio', (req, res) => {
    res.json(userPortfolio);
});



app.post('/api/portfolio/transaction', (req, res) => {
    const { type, ticker, shares, price } = req.body;

    if (!ticker || shares <= 0 || price <= 0) {
        return res.status(400).json({ error: 'Invalid transaction data' });
    }

    const transactionTotal = shares * price;

    if (type === 'buy') {
        if (userPortfolio.balance < transactionTotal) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        userPortfolio.balance -= transactionTotal;
        userPortfolio.ownedShares[ticker] = (userPortfolio.ownedShares[ticker] || 0) + shares;
    } else if (type === 'sell') {
        if (!userPortfolio.ownedShares[ticker] || userPortfolio.ownedShares[ticker] < shares) {
            return res.status(400).json({ error: 'Not enough shares to sell.' });
        }
        userPortfolio.balance += transactionTotal;
        userPortfolio.ownedShares[ticker] -= shares;
        if (userPortfolio.ownedShares[ticker] === 0) {
            delete userPortfolio.ownedShares[ticker];
        }
    } else {
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Add transaction to history
    userPortfolio.transactions.push({
        type,
        ticker,
        shares,
        price,
        total: transactionTotal,
        date: new Date().toISOString(),
    });

    res.json(userPortfolio);
});

// API Endpoints
app.get('/api/stocks', (req, res) => {
  //  console.log("GET /api/stocks CALLED");
    res.json(stocks);
});

app.get('/api/news', (req, res) => {
   // console.log("GET /api/news CALLED");
    res.json({ currentNews, pastNews});
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


app.get('/api/stocks/candlestick', (req, res) => {
    console.log("GET /api/stocks/candlestick CALLED");
    const candlestickData = stocks.map(stock => ({
        ticker: stock.ticker,
        open: stock.openPrice,
        high: stock.highPrice,
        low: stock.lowPrice,
        close: stock.closePrice || stock.price, // If market hasn't closed, use latest price
        date: currentDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    }));

    res.json(candlestickData);
});



app.get('/api/market-sentiment', (req, res) => {
   // console.log("GET /api/market-sentiment CALLED");
    res.json(marketSentiment);
});

app.get('/api/market-index', (req, res) => {
    res.json({
        indexValue: marketIndex.toFixed(2),
        performance: getIndexPerformance().toFixed(2),
    });
});

app.get('/api/balance', (req, res) => {
   // console.log("GET /api/balance CALLED");
    res.json({ balance: userPortfolio.balance });
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

    if (type === 'buy' && userPortfolio.balance >= transactionAmount) {
        userPortfolio.balance -= transactionAmount;
        userPortfolio.ownedShares[stock.ticker] = (userPortfolio.ownedShares[stock.ticker] || 0) + amount;
    } else if (type === 'sell') {
        if (!userPortfolio.ownedShares[stock.ticker] || userPortfolio.ownedShares[stock.ticker] < amount) {
            return res.status(400).json({ error: 'Not enough shares to sell.' });
        }
        userPortfolio.balance += transactionAmount;
        userPortfolio.ownedShares[stock.ticker] -= amount;
        if (userPortfolio.ownedShares[stock.ticker] <= 0) {
            delete userPortfolio.ownedShares[stock.ticker];
        }
    } else {
        return res.status(400).json({ error: 'Invalid transaction or insufficient funds.' });
    }

    // Add to transaction history
    userPortfolio.transactions.push({
        type,
        ticker,
        shares: amount,
        price: stock.price,
        total: transactionAmount,
        date: new Date().toISOString(),
    });

    res.json({ balance: userPortfolio.balance });
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
            userPortfolio.ownedShares[ticker] = ownedShares[ticker];
            console.log(userPortfolio.ownedShares);
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