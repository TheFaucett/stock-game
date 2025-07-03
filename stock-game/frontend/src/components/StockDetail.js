import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StockGraph from './StockGraph'
import TransactionModal from './TransactionModal'
import '../styles/stockdetail.css'
import { getOrCreateUserId } from '../userId'

export default function StockDetail() {
  const { ticker } = useParams()
  const userId = getOrCreateUserId()
  const [stock, setStock] = useState(null)
  const [history, setHistory] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [watchlist, setWatchlist] = useState([])
  const [loadingWatchlist, setLoadingWatchlist] = useState(true)

  // Fetch stock info, price history, and watchlist on mount and ticker change
  useEffect(() => {
    async function fetchStock() {
      const res = await fetch(`http://localhost:5000/api/stocks`)
      const list = await res.json()
      setStock(list.find(s => s.ticker === ticker) || null)
    }
    async function fetchHistory() {
      const res = await fetch(`http://localhost:5000/api/stocks/${ticker}/history`)
      const obj = await res.json()
      if (Array.isArray(obj.history)) setHistory(obj.history)
    }
    async function fetchWatchlist() {
      setLoadingWatchlist(true)
      const res = await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist`)
      const obj = await res.json()
      setWatchlist(Array.isArray(obj.watchlist) ? obj.watchlist : [])
      setLoadingWatchlist(false)
    }
    fetchStock()
    fetchHistory()
    fetchWatchlist()
    // eslint-disable-next-line
  }, [ticker, userId])

  // Add to watchlist
  async function handleAddWatch() {
    await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist/${ticker}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker })
    })
    // Refresh from backend to stay consistent!
    const res = await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist`)
    const obj = await res.json()
    setWatchlist(Array.isArray(obj.watchlist) ? obj.watchlist : [])
  }

  // Remove from watchlist
  async function handleRemoveWatch() {
    await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist/${ticker}/delete`, {
      method: "DELETE"
    })
    // Refresh from backend to stay consistent!
    const res = await fetch(`http://localhost:5000/api/portfolio/${userId}/watchlist`)
    const obj = await res.json()
    setWatchlist(Array.isArray(obj.watchlist) ? obj.watchlist : [])
  }

  // Helper: is this stock already in watchlist?
  const onWatchlist = watchlist.includes(ticker.toUpperCase())

  // Transaction handler
  const performTransaction = async (type, shares, strike, expiryTick) => {
    const payload = { userId, type, ticker, shares }
    if (type === 'short') payload.expiryTick = expiryTick
    if (type === 'call' || type === 'put') {
      payload.strike = strike
      payload.expiryTick = expiryTick
    }

    const res = await fetch(
      `http://localhost:5000/api/portfolio/${userId}/transactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )
    const data = await res.json()
    if (!res.ok) {
      alert(`Failed: ${data.error}`)
    } else {
      alert('Transaction successful!')
    }
  }

  // Not found
  if (!stock) {
    return (
      <div>
        <h2>Stock Not Found</h2>
        <p>{ticker} does not exist.</p>
        <Link to="/">← Back</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>{stock.ticker}</h1>
      <p>Price: ${stock.price.toFixed(2)}</p>
      <p>Change: {stock.change}%</p>
      <p>EPS: {stock.eps}</p>
      <p>Market Cap: ${(stock.price * stock.outstandingShares / 1e9).toFixed(2)}B</p>

      {/* Actions row: Trade + Watchlist */}
      <div className="stock-actions" style={{ marginBottom: 24 }}>
        <button className="stock-btn trade" onClick={() => setShowModal(true)}>
          Trade
        </button>
        {loadingWatchlist ? (
          <button className="stock-btn" disabled>Loading…</button>
        ) : onWatchlist ? (
          <button
            className="stock-btn"
            style={{ background: "#7c3aed" }}
            onClick={handleRemoveWatch}
          >
            ★ Remove from Watchlist
          </button>
        ) : (
          <button
            className="stock-btn"
            style={{ background: "#60a5fa" }}
            onClick={handleAddWatch}
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
  )
}
