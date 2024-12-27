const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;


let clientBalance = 10000;
let ownedShares = {};

// Enable CORS so frontend can access backend
app.use(cors());
app.use(express.json()); // Enable JSON body parsing
// Simple route to send a message
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});



const stocks = [
    { ticker: 'AAPL', price: 145.32, change: 1.23 },
    { ticker: 'GOOGL', price: 2783.50, change: -0.67 },
    { ticker: 'AMZN', price: 3452.12, change: 0.45 },
    { ticker: 'MSFT', price: 299.70, change: 2.13 },
    { ticker: 'TSLA', price: 650.30, change: 4.23 },


]

app.get('/api/stocks', (req, res) => {
    console.log("GET /api/stocks CALLED");
    res.json(stocks);
});



app.get('/api/balance', (req, res) => {
    console.log("GET /api/balance CALLED");
    res.json({ balance: clientBalance });
});


app.post('/api/balance', (req, res) => {
    const { type, amount } = req.body; // `type` is 'buy' or 'sell', `amount` is the transaction value

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid transaction amount' });
    }

    const stock = stocks.find(s => s.ticker === req.body.ticker); // COULD HAVE ISSUE HERE if its not called ticker💥

    const transactionAmount = amount * stock.price;




    if (type === 'buy' && clientBalance >= transactionAmount) {
        clientBalance -= transactionAmount;
        ownedShares[stock.ticker] = (ownedShares[stock.ticker] || 0) + amount
    } else if (type === 'sell') {
        clientBalance += transactionAmount; 
        ownedShares[stock.ticker] -= transactionAmount;
        if (ownedShares[stock.ticker] <= 0) {
            delete ownedShares[stock.ticker];
        }
    } else {
        return res.status(400).json({ error: 'Invalid transaction or insufficient funds' });
    }



    






    res.json({ balance: clientBalance }); // Respond with updated balance
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
