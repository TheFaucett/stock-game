import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StockDetail from './components/StockDetail';
import useAppSync from './hooks/useAppSync'; // Import the custom hook

function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(0);
    const [currentNews, setCurrentNews] = useState(null);

    // Use the custom hook for syncing app state
    useAppSync(setStocks, setBalance, setCurrentNews);

    // Handle buy and sell transactions
    function handleTransaction(type, amount, ticker) {
        fetch('http://localhost:5000/api/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, amount, ticker }),
        })
            .then((response) => response.json())
            .then((data) => setBalance(data.balance))
            .catch((error) => console.error('Error updating balance:', error));
    }

    // Stock List Component
    const StockList = () => (
        <div>
            <h1>Stock List</h1>
            <p>Balance: ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}</p>
            {currentNews && (
                <div style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
                    <h3>Current News:</h3>
                    <p>
                        <strong>{currentNews.ticker}</strong>: {currentNews.description}
                    </p>
                </div>
            )}
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Price</th>
                        <th>Change (%)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map((stock) => (
                        <tr key={stock.ticker}>
                            <td>
                                <Link
                                    to={`/stock/${stock.ticker}`}
                                    style={{
                                        color: stock.change > 0 ? 'green' : 'red',
                                        textDecoration: 'none',
                                    }}
                                >
                                    {stock.ticker}
                                </Link>
                            </td>
                            <td>${typeof stock.price === 'number' ? stock.price.toFixed(2) : '0.00'}</td>
                            <td
                                style={{
                                    color: stock.change > 0 ? 'green' : 'red',
                                }}
                            >
                                {stock.change > 0 ? '+' : ''}
                                {typeof stock.change === 'number' ? stock.change.toFixed(2) : '0.00'}%
                            </td>
                            <td>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to buy: ');
                                        if (amount) handleTransaction('buy', parseInt(amount), stock.ticker);
                                    }}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to sell: ');
                                        if (amount) handleTransaction('sell', parseInt(amount), stock.ticker);
                                    }}
                                >
                                    Sell
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StockList />} />
                <Route path="/stock/:ticker" element={<StockDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
