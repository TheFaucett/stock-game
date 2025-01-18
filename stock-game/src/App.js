import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Components
import StockDetail from './components/StockDetail';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import MarketIndex from './components/MarketIndex';

// Hooks
import useAppSync from './hooks/useAppSync';

function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(() => {
        const savedBalance = localStorage.getItem('balance');
        return savedBalance ? parseFloat(savedBalance) : 10000;
    });

    const [ownedShares, setOwnedShares] = useState(() => {
        const savedShares = localStorage.getItem('ownedShares');
        console.log('Saved Shares:', savedShares);
        return savedShares ? JSON.parse(savedShares) : {};
    });

    const [currentNews, setCurrentNews] = useState([]);
    const [marketSentiment, setMarketSentiment] = useState(0);

    const [watchlist, setWatchlist] = useState(() => {
        const savedWatchlist = localStorage.getItem('watchlist');
        return savedWatchlist ? JSON.parse(savedWatchlist) : [];
    });

    // Custom Hook to Sync State with Backend
    useAppSync(setStocks, setBalance, setCurrentNews, setMarketSentiment);

    // Sync owned shares with backend on component mount
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
                console.log('Owned shares synced successfully with backend');
            } catch (error) {
                console.error('Error syncing owned shares with backend:', error);
            }
        };

        if (Object.keys(ownedShares).length > 0) {
            syncStateWithBackend();
        }
    }, [ownedShares]);

    // Persist balance to localStorage
    useEffect(() => {
        localStorage.setItem('balance', balance);
    }, [balance]);

    // Persist owned shares to localStorage
    useEffect(() => {
        localStorage.setItem('ownedShares', JSON.stringify(ownedShares));
    }, [ownedShares]);

    // Persist watchlist to localStorage
    useEffect(() => {
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const addToWatchlist = (ticker) => {
        if (!watchlist.includes(ticker)) {
            setWatchlist((prev) => [...prev, ticker]);
        }
    };

    const removeFromWatchlist = (ticker) => {
        setWatchlist((prev) => prev.filter((item) => item !== ticker));
    };

    const handleTransaction = (type, amount, ticker) => {
        const stock = stocks.find((s) => s.ticker === ticker);
        if (!stock) return alert('Stock not found!');

        fetch('http://localhost:5000/api/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, amount, ticker }),
        })
            .then((response) => response.json())
            .then((data) => {
                setBalance(data.balance);
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
            })
            .catch((error) => console.error('Error processing transaction:', error));
    };

    const StockList = () => (
        <div>
            <h1>Stock List</h1>
            <p>Balance: ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}</p>
            <p>
                Market Sentiment:{' '}
                {marketSentiment > 0 ? 'Bullish' : marketSentiment < 0 ? 'Bearish' : 'Neutral'}
            </p>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/watchlist" style={{ marginLeft: '15px' }}>
                Watchlist
            </Link>

            {currentNews.length > 0 && (
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
                            <td>${stock.price.toFixed(2)}</td>
                            <td
                                style={{
                                    color: stock.change > 0 ? 'green' : 'red',
                                }}
                            >
                                {stock.change > 0 ? '+' : ''}
                                {stock.change.toFixed(2)}%
                            </td>
                            <td>{stock.peRatio || 'N/A'}</td>
                            <td>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to buy:');
                                        if (amount) handleTransaction('buy', parseInt(amount, 10), stock.ticker);
                                    }}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to sell:');
                                        if (amount) handleTransaction('sell', parseInt(amount, 10), stock.ticker);
                                    }}
                                >
                                    Sell
                                </button>
                                <button onClick={() => addToWatchlist(stock.ticker)}>Add to Watchlist</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <BrowserRouter>
            <MarketIndex />
            <Routes>
                <Route path="/" element={<StockList />} />
                <Route path="/stock/:ticker" element={<StockDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/watchlist" element={<Watchlist />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
