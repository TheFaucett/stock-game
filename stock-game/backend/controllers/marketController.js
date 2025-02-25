const Stock = require("../models/Stock");

/*
    NOTE THAT MUCH OF THE RETURN AND MONGOOSE FUNCTIONALITY IS BLACKBOXED FOR THE FOLLOWING REASONS:

    Errors concerning a mismatch of the "__v" value that mongoose uses for every stock after it is updated
    It uses this complicated ahh fix to avoid some race conditions

*/



async function updateMarket() {
    try {
        console.log("🔄 Updating market state...");

        // Fetch all stocks from MongoDB
        const stocks = await Stock.find();

        if (!stocks || stocks.length === 0) {
            console.error("⚠️ No stocks found in the database!");
            return;
        }

        const bulkUpdates = stocks.map((stock) => {
            if (!stock || !stock.ticker) {
                console.error("❌ Invalid stock found:", stock);
                return null; // Skip invalid stocks
            }

            // Calculate new price with a fluctuation
            let fluctuation = (Math.random() - 0.5) * 2;
            let newPrice = Math.max(stock.price + (stock.price * fluctuation / 100), 0.01);

            // Ensure history is always 30 entries
            let updatedHistory = [...stock.history.slice(-29), newPrice];

            // Calculate change percentage
            let previousPrice = stock.history.length > 1 ? stock.history[stock.history.length - 1] : stock.price;
            let newChange = parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));

            // Return bulk update object for MongoDB
            return {
                updateOne: {
                    filter: { _id: stock._id },
                    update: {
                        $set: { price: newPrice, change: newChange, history: updatedHistory }
                    }
                }
            };
        }).filter(update => update !== null); // Remove any null values

        if (bulkUpdates.length > 0) {
            await Stock.bulkWrite(bulkUpdates); // Execute bulk update
            console.log(`✅ Market update complete. ${bulkUpdates.length} stocks updated.`);
        }

    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { updateMarket };
