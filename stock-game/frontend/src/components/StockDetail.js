import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';
import EarningsTable from './EarningsTable';
import TransactionModal from './TransactionModal';
import OptionTutorial from "./OptionTutorial";
import '../styles/stockdetail.css';
import { getOrCreateUserId } from '../userId';
import { useTick } from '../TickProvider';
import API_BASE_URL from '../apiConfig';

export default function StockDetail() {
  const { ticker } = useParams();
  const userId = getOrCreateUserId();
  const { tick } = useTick();

  const [stock, setStock] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlistPending, setWatchlistPending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOptionTutorial, setShowOptionTutorial] = useState(false);
  const [isMegaCap, setIsMegaCap] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const ac = new AbortController();
    try {
      // fetch only this ticker (smaller payload)
      const sRes = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`, { signal: ac.signal });
      if (!sRes.ok) throw new Error('stock fetch failed');
      const sObj = await sRes.json();
      setStock(sObj);

      // watchlist
      const wRes = await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist`, { signal: ac.signal });
      const wObj = await wRes.json();
      setWatchlist(Array.isArray(wObj.watchlist) ? wObj.watchlist : []);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('StockDetail fetch error:', e);
        setStock(null);
      }
    } finally {
      setLoading(false);
    }
    return () => ac.abort();
  }, [ticker, userId]);

  // refresh when tick changes (unless modal is open)
  useEffect(() => {
    if (!showModal) fetchAll();
  }, [fetchAll, tick, showModal]);

  // Mega cap check
  useEffect(() => {
    let ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stocks/mega-caps`, { signal: ac.signal });
        const megaData = await res.json();
        if (!megaData || !Array.isArray(megaData.megaCaps) || typeof megaData.selectionTick !== "number") return;
        const revealTimePassed = tick - megaData.selectionTick >= 200;
        setIsMegaCap(megaData.megaCaps.includes(ticker) && revealTimePassed);
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Mega caps fetch failed:', err);
      }
    })();
    return () => ac.abort();
  }, [ticker, tick]);

  function handleTradeClick() {
    const hasSeen = localStorage.getItem("hasSeenOptionTutorial");
    if (!hasSeen) {
      setShowOptionTutorial(true);
      localStorage.setItem("hasSeenOptionTutorial", "true");
    }
    setShowModal(true);
  }

  async function handleAddWatch() {
    setWatchlistPending(true);
    await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist/${ticker}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker })
    });
    await fetchAll();
    setWatchlistPending(false);
  }

  async function handleRemoveWatch() {
    setWatchlistPending(true);
    await fetch(`${API_BASE_URL}/api/portfolio/${userId}/watchlist/${ticker}/delete`, { method: "DELETE" });
    await fetchAll();
    setWatchlistPending(false);
  }

  const onWatchlist = watchlist.includes((ticker || '').toUpperCase());

  const performTransaction = async (type, shares, strike, expiryTick) => {
    const payload = { userId, type, ticker, shares };
    if (type === 'short') payload.expiryTick = expiryTick;
    if (type === 'call' || type === 'put') {
      payload.strike = strike;
      payload.expiryTick = expiryTick;
      payload.contracts = shares;
      payload.multiplier = 100;
    }
    const res = await fetch(`${API_BASE_URL}/api/portfolio/${userId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Failed: ${data.error}`);
    } else {
      alert('Transaction successful!');
      fetchAll();
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}><p>Loading…</p></div>;
  }
  if (!stock) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Stock Not Found</h2>
        <p>{ticker} does not exist.</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <OptionTutorial isOpen={showOptionTutorial} onClose={() => setShowOptionTutorial(false)} />

      <h1>{isMegaCap && <span>✨</span>}{stock.ticker}</h1>
      <p>Price: ${Number(stock.price).toFixed(2)}</p>
      <p>Change: {Number(stock.change).toFixed(2)}%</p>
      <p>EPS: {stock.eps}</p>
      <p>Market Cap: ${(Number(stock.price) * Number(stock.outstandingShares) / 1e9).toFixed(2)}B</p>

      <div className="stock-actions" style={{ marginBottom: 24 }}>
        <button className="stock-btn trade" onClick={handleTradeClick}>Trade</button>

        {watchlistPending ? (
          <button className="stock-btn" disabled>Loading…</button>
        ) : onWatchlist ? (
          <button className="stock-btn" style={{ background: "#7c3aed" }} onClick={handleRemoveWatch}>
            ★ Remove from Watchlist
          </button>
        ) : (
          <button className="stock-btn" style={{ background: "#60a5fa" }} onClick={handleAddWatch}>
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

      {/* ⬇️ Always render the graph; it fetches its own tail data */}
      <h3>Price History</h3>
      <StockGraph ticker={ticker} height={280} />

      <div style={{ height: 35 }} />

      <EarningsTable report={stock.lastEarningsReport} />

      <Link to="/" className="back-button">← Back</Link>
    </div>
  );
}
