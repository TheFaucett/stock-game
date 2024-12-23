const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Enable CORS so frontend can access backend
app.use(cors());

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

app.get("api/stocks", (req, res) => {
    res.json(stocks);
  });




// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
