import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Components
import StockDetail from './components/StockDetail';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import MarketIndex from './components/MarketIndex';

// Hooks
import useAppSync from './hooks/useAppSync';

// Styles
import './styles/style.css';

function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(() => {
        const savedBalance = localStorage.getItem('balance');
        return savedBalance ? parseFloat(savedBalance) : 10000;
    });

    const [ownedShares, setOwnedShares] = useState(() => {
        const savedShares = localStorage.getItem('ownedShares');
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

    useEffect(() => {
        if (Object.keys(ownedShares).length > 0) {
            fetch('http://localhost:5000/api/sync-shares', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ownedShares }),
            })
                .then((res) => res.ok && console.log('Owned shares synced successfully.'))
                .catch((error) => console.error('Error syncing owned shares:', error));
        }
    }, [ownedShares]);

    // Persist local state to `localStorage`
    useEffect(() => {
        localStorage.setItem('balance', balance);
    }, [balance]);

    useEffect(() => {
        localStorage.setItem('ownedShares', JSON.stringify(ownedShares));
    }, [ownedShares]);

    useEffect(() => {
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const StockList = () => (
        <div className="homepage-container">
            {/* News Section */}
            <div className="news-section">
                <div className="news-box">
                    {currentNews.length ? (
                        currentNews.map((news, index) => (
                            <p key={index}>
                                <strong>{news.type.toUpperCase()}:</strong> {news.description}
                                {news.ticker && <span> (Ticker: {news.ticker})</span>}
                            </p>
                        ))
                    ) : (
                        <p>No current news available.</p>
                    )}
                </div>
            </div>

            {/* Main Section */}
            <div className="main-section">
                {/* Watchlist Section */}
                <div className="watchlist-section">
                    <h3>WATCHLIST</h3>
                    {watchlist.length ? (
                        watchlist.map((ticker, index) => (
                            <div key={index} className="watchlist-item">
                                <img src={`https://via.placeholder.com/50`} alt={`Stock ${ticker}`} />
                                <p>{ticker}</p>
                            </div>
                        ))
                    ) : (
                        <p>Your watchlist is empty.</p>
                    )}
                </div>

                {/* Portfolio Section */}
                <div className="portfolio-section">
                    <h3>PORTFOLIO</h3>
                    <p>
                        <strong>Balance:</strong> ${balance.toFixed(2)}
                    </p>
                    {Object.keys(ownedShares).length > 0 ? (
                        <ul>
                            {Object.entries(ownedShares).map(([ticker, shares]) => (
                                <li key={ticker}>
                                    {ticker}: {shares} shares
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>You do not own any shares.</p>
                    )}
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
