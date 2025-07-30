import React, { useEffect, useState, useCallback} from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';
import TransactionModal from './TransactionModal';
import OptionTutorial from "./OptionTutorial";
import '../styles/stockdetail.css';
import { getOrCreateUserId } from '../userId';
import { useTick } from '../TickProvider';
import API_BASE_URL from '../apiConfig';
export default function StockDetail() {
  const { ticker } = useParams();
  const userId = getOrCreateUserId();
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlistPending, setWatchlistPending] = useState(false);
  const [showOptionTutorial, setShowOptionTutorial] = useState(false);
  const [isMegaCap, setisMegaCap] = useState(false);
  const { tick } = useTick(); // always use {tick} destructure

  // Single function to fetch everything
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Stock details
      const res = await fetch(`${API_BASE_URL}/api/stocks`);
      const list = await res.json();
      setStock(list.find(s => s.ticker === ticker) || null);

      // History
      const res2 = await fetch(`${API_BASE_URL}/api/stocks/${ticker}/history`);
      const obj2 = await res2.json();
      setHistory(Array.isArray(obj2.history) ? obj2.history : []);

      // Watchlist
      const res3 = await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist`);
      const obj3 = await res3.json();
      setWatchlist(Array.isArray(obj3.watchlist) ? obj3.watchlist : []);
    } catch (err) {
      // Optionally add error handling here
      setStock(null);
    } finally {
      setLoading(false);
    }
  }, [ticker, userId]);

  // Run fetchAll whenever ticker/userId/tick changes
  useEffect(() => {
    fetchAll();
  }, [fetchAll, tick]);
  useEffect(() => {
  async function fetchMegaCaps() {
      try {
      const res = await fetch(`${API_BASE_URL}/api/stocks/mega-caps`);
      const megaData = await res.json(); // ✅ parse JSON

      // make sure it has the right shape
      if (!megaData || !Array.isArray(megaData.megaCaps) || typeof megaData.selectionTick !== "number") {
          console.warn("Mega caps API returned unexpected format:", megaData);
          return;
      }

      const revealTimePassed = tick - megaData.selectionTick >= 200;
      if (megaData.megaCaps.includes(ticker) && revealTimePassed) {
          setisMegaCap(true);
      } else {
          setisMegaCap(false);
      }
      } catch (err) {
      console.error("Failed to fetch mega caps:", err);
      }
  }

  fetchMegaCaps();
  }, [ticker, tick]); // ✅ also depends on tick

  // Handle Trade button and OptionTutorial logic
  function handleTradeClick() {
    const hasSeen = localStorage.getItem("hasSeenOptionTutorial");
    if (!hasSeen) {
      setShowOptionTutorial(true);
      localStorage.setItem("hasSeenOptionTutorial", "true");
    }
    setShowModal(true);
  }

  // --- Optimistic Add/Remove for Watchlist ---
  async function handleAddWatch() {
    setWatchlistPending(true);
    await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist/${ticker}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker })
    });
    await fetchAll(); // Always re-sync after
    setWatchlistPending(false);
  }

  async function handleRemoveWatch() {
    setWatchlistPending(true);
    await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist/${ticker}/delete`, {
      method: "DELETE"
    });
    await fetchAll(); // Always re-sync after
    setWatchlistPending(false);
  }

  // Only allow add/remove when *not* pending or loading
  const onWatchlist = watchlist.includes(ticker.toUpperCase());

  const performTransaction = async (type, shares, strike, expiryTick) => {
    const payload = { userId, type, ticker, shares };
    if (type === 'short') payload.expiryTick = expiryTick;
    if (type === 'call' || type === 'put') {
      payload.strike = strike;
      payload.expiryTick = expiryTick;
    }
    const res = await fetch(
      `${API_BASE_URL}/api/portfolio/${userId}/transactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await res.json();
    if (!res.ok) {
      alert(`Failed: ${data.error}`);
    } else {
      alert('Transaction successful!');
      fetchAll();
    }
  };

  // Loading or not found states
  if (loading) {
    return <div style={{padding: 20}}><p>Loading…</p></div>;
  }
  if (!stock) {
    return (
      <div>
        <h2>Stock Not Found</h2>
        <p>{ticker} does not exist.</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  // Render UI
  return (
    <div style={{ padding: 20 }}>
      <OptionTutorial isOpen={showOptionTutorial} onClose={() => setShowOptionTutorial(false)} />
      <h1>{isMegaCap && <span>✨</span>}{stock.ticker}</h1>
      <p>Price: ${stock.price.toFixed(2)}</p>
      <p>Change: {stock.change}%</p>
      <p>EPS: {stock.eps}</p>
      <p>Market Cap: ${(stock.price * stock.outstandingShares / 1e9).toFixed(2)}B</p>

      <div className="stock-actions" style={{ marginBottom: 24 }}>
        <button className="stock-btn trade" onClick={handleTradeClick}>
          Trade
        </button>
        {loading || watchlistPending ? (
          <button className="stock-btn" disabled>Loading…</button>
        ) : onWatchlist ? (
          <button
            className="stock-btn"
            style={{ background: "#7c3aed" }}
            onClick={handleRemoveWatch}
            disabled={watchlistPending}
          >
            ★ Remove from Watchlist
          </button>
        ) : (
          <button
            className="stock-btn"
            style={{ background: "#60a5fa" }}
            onClick={handleAddWatch}
            disabled={watchlistPending}
          >
            ☆ Add to Watchlist
          </button>
        )}
      </div>

      <TransactionModal
        show={showModal}
        onClose={() => setShowModal(false)}
        ticker={ticker}
        onConfirm={performTransaction}
      />

      {history.length > 0 && (
        <>
          <h3>Price History</h3>
          <StockGraph ticker={ticker} history={history} />
        </>
      )}
      <div style={{ height: "40px" }} /> {/* Spacer */}

      <Link to="/" className="back-button">← Back</Link>
    </div>
  );
}