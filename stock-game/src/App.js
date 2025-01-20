import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Components
import StockDetail from './components/StockDetail';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import MarketIndex from './components/MarketIndex';
//hooks
import useAppSync from './hooks/useAppSync';

//styles 
import './styles/style.css';

if (process.env.NODE_ENV === 'development') {
    console.log('Development Mode');
}
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
        <div className="homepage-container">
            {/* News Section */}
            <div className="news-section">
                <div className="news-box">
                    <p><strong>GLOBAL:</strong> Lorem ipsum dolor sit amet</p>
                    <p><strong>SECTOR:</strong> Lorem ipsum dolor sit amet</p>
                    <p><strong>STOCK:</strong> Lorem ipsum dolor sit amet</p>
                </div>
            </div>

            {/* Watchlist and Portfolio Section */}
            <div className="main-section">
                {/* Watchlist */}
                <div className="watchlist-section">
                    <h3>WATCHLIST</h3>
                    <div className="watchlist-item">
                        <img src="chart1.png" alt="Chart 1" />
                        <p>LOREM</p>
                    </div>
                    <div className="watchlist-item">
                        <img src="chart2.png" alt="Chart 2" />
                        <p>IPSUM</p>
                    </div>
                </div>

                {/* Portfolio */}
                <div className="portfolio-section">
                    <h3>PORTFOLIO</h3>
                    <p>Lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet</p>
                </div>
            </div>
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
