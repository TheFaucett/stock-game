const Sentiment = require('sentiment');
const sentiment = new Sentiment();
const fs = require('fs');
const path = require('path');



sentiment.registerLanguage('en', { // here to keyline some stock buzzwords
    labels: {
        // Positive Buzzwords
        "bullish": 3,
        "rally": 3,
        "surge": 4,
        "record-high": 5,
        "growth": 3,
        "breakthrough": 5,
        "profitable": 4,
        "momentum": 2,
        "upside": 3,
        "expansion": 3,
        "outperform": 4,
        "beat expectations": 5,
        "strong earnings": 5,
        "dividend increase": 3,
        "buyback": 4,
        "strategic partnership": 3,
        "cutting-edge": 4,
        "innovative": 4,
        "approval": 3,
        "rebound": 3,

        // Negative Buzzwords
        "bearish": -3,
        "plunge": -5,
        "sell-off": -5,
        "volatile": -2,
        "decline": -3,
        "correction": -3,
        "losses": -4,
        "scandal": -5,
        "bankruptcy": -5,
        "downgrade": -4,
        "missed expectations": -4,
        "disappointing": -4,
        "litigation": -3,
        "default": -5,
        "overleveraged": -3,
        "fine": -3,
        "data breach": -5,
        "poor liquidity": -3,

        // Neutral or Context-Dependent Buzzwords
        "acquisition": 0,
        "merger": 0,
        "IPO": 1,
        "consolidation": 0,
        "restructuring": -1, // Slightly negative due to layoffs
        "spin-off": 0,
        "new regulation": -1, // Often introduces restrictions
        "tax reform": 1, // Context-dependent
        "buyout": 1,

        // Healthcare Terms
        "FDA approval": 5,
        "clinical trial success": 4,
        "novel therapy": 4,
        "personalized medicine": 4,
        "breakthrough therapy": 5,
        "regenerative medicine": 4,
        "drug recall": -5,
        "unexpected halt": -4,
        "strong demand": 3,
        "positive safety review": 4,
        "philanthropy": 3,

        // Technology Terms
        "AI-powered": 4,
        "machine learning": 3,
        "blockchain": 3,
        "disruptive": 4,
        "cloud computing": 3,
        "cybersecurity": 4,
        "digital transformation": 4,
        "data breach": -5,
        "platform outage": -4,
        "regulatory approval": 3,
        "smart infrastructure": 4,

        // Financial Terms
        "interest rate hike": -3,
        "yield curve": -1, // Neutral unless interpreted contextually
        "treasury bonds": 1,
        "hedge fund": 1,
        "asset management": 2,
        "liquidity crisis": -4,
        "market crash": -5,
        "record profits": 5,
        "recession": -5,
        "stagflation": -4,
        "trade surplus": 2,
        "trade deficit": -3,
        "strong balance sheet": 4,
        "cost cutting": 2, // Can be positive for margins
        "missed revenue": -4
    }
});


function getStockEvents() {
    const filePath = path.join(__dirname, 'news.json');
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const parsedData = JSON.parse(rawData);

        // Flatten the nested structure
        const events = [];
        for (const sector in parsedData.sectors) {
            events.push(...parsedData.sectors[sector]);
        }

        return events; // Flattened array of stock events
    } catch (error) {
        console.error("Error reading or parsing JSON:", error);
        return [];
    }
}

function analyzeEvents() {
    const events = getStockEvents();
    return events.map((event) => {
        const sentimentResult = sentiment.analyze(event.description);
        return {
            ...event,
            sentimentScore: sentimentResult.score,
            sentimentComparative: sentimentResult.comparative,
        };
    });
}

module.exports = {
    analyzeEvents,
};
