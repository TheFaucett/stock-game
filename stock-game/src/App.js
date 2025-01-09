import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StockDetail from './components/StockDetail';
import useAppSync from './hooks/useAppSync';

function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(() => {
        const savedBalance = localStorage.getItem('balance');
        return savedBalance ? parseFloat(savedBalance) : 10000;
    });

    const [ownedShares, setOwnedShares] = useState(() => {
        const savedShares = localStorage.getItem('ownedShares');
        console.log('savedShares:', savedShares);

        return savedShares ? JSON.parse(savedShares) : {};
    });
    
    const [currentNews, setCurrentNews] = useState([]);
    const [marketSentiment, setMarketSentiment] = useState(0);



    useAppSync(setStocks, setBalance, setCurrentNews, setMarketSentiment);


    // Sync owned shares with backend on mount
    useEffect(() => {
        const syncStateWithBackend = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/sync-shares', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ownedShares }),
                });
                if (!response.ok) {
                    throw new Error('Failed to sync owned shares with backend');
                }
                console.log('Owned shares synced with backend successfully');
            } catch (error) {
                console.error('Error syncing owned shares with backend:', error);
            }
        };

        syncStateWithBackend();
    }, []);

    useEffect(() => {
        localStorage.setItem('balance', balance);
    }, [balance]);

    useEffect(() => {
        localStorage.setItem('ownedShares', JSON.stringify(ownedShares));
    }, [ownedShares]);

    function handleTransaction(type, amount, ticker) {
        const stock = stocks.find((s) => s.ticker === ticker);
        if (!stock) return alert('Stock not found!');
        


        fetch('http://localhost:5000/api/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, amount, ticker }),
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json();
                }
                return response.json();
            })
            .then((data) => {
                setBalance(data.balance); // Update balance immediately
                setOwnedShares((prevShares) => {
                    const updatedShares = { ...prevShares };
                    if (type === 'buy') {
                        updatedShares[ticker] = (updatedShares[ticker] || 0) + amount;
                    } else if (type === 'sell') {
                        updatedShares[ticker] -= amount;
                        if (updatedShares[ticker] <= 0) {
                            delete updatedShares[ticker];
                        }
                    }
                    return updatedShares;
                });

                fetch('http://localhost:5000/api/sync-shares', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ownedShares }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Failed to sync updated shares with backend');
                        }
                        console.log('Owned shares updated and synced with backend');
                    })
                    .catch((error) => console.error('Error syncing owned shares after transaction:', error));
            })
            .catch((error) => {
                console.error('Error processing transaction:', error);
            });
    }

    const StockList = () => (
        <div>
            <h1>Stock List</h1>
            <p>Balance: ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}</p>
            <p>
                Market Sentiment: {marketSentiment > 0 ? 'Bullish' : marketSentiment < 0 ? 'Bearish' : 'Neutral'}
            </p>
            {currentNews && currentNews.length > 0 && (
                <div style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
                    <h3>Current News:</h3>
                    {currentNews.map((newsItem, index) => (
                        <p key={index}>
                            <strong>{newsItem.type.toUpperCase()}</strong>: {newsItem.description}
                            {newsItem.ticker && <span> (Ticker: {newsItem.ticker})</span>}

                        </p>
                    ))}
                </div>
            )}
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Price</th>
                        <th>Change (%)</th>
                        <th>P/E Ratio</th>
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
                            <td>{stock.peRatio ? stock.peRatio.toFixed(2) : 'N/A'}</td>
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
