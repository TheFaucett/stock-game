// src/components/StockDetail.jsx
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StockGraph from './StockGraph'
import TransactionModal from './TransactionModal'
import '../styles/stockdetail.css'

export default function StockDetail() {
  const { ticker } = useParams()
  const [stock, setStock]   = useState(null)
  const [history, setHistory] = useState([])
  const [showModal, setShowModal] = useState(false)

  // fetch stock & history...
  useEffect(() => {
    async function fetchStock() {
      const res    = await fetch(`http://localhost:5000/api/stocks`)
      const list   = await res.json()
      setStock(list.find(s => s.ticker===ticker) || null)
    }
    async function fetchHistory() {
      const res  = await fetch(`http://localhost:5000/api/stocks/${ticker}/history`)
      const obj  = await res.json()
      if (Array.isArray(obj.history)) setHistory(obj.history)
    }
    fetchStock()
    fetchHistory()
  }, [ticker])

  // lifts your old performTransaction into a callback the modal can call:
  const performTransaction = async (type, shares, strike, expiryTick) => {
    const userId = '67af822e5609849ac14d7942'
    const payload = { userId, type, ticker, shares }
    if (type==='short')       payload.expiryTick = expiryTick
    if (type==='call' || type==='put') {
      payload.strike     = strike
      payload.expiryTick = expiryTick
    }

    const res  = await fetch(
      `http://localhost:5000/api/portfolio/${userId}/transactions`,
      {
        method:  'POST',
        headers: {'Content-Type':'application/json'},
        body:    JSON.stringify(payload)
      }
    )
    const data = await res.json()
    if (!res.ok) {
      alert(`Failed: ${data.error}`)
    } else {
      alert('Transaction successful!')
    }
  }

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

      {/* single Trade button opens the modal */}
      <button className="stock-btn trade" onClick={()=>setShowModal(true)}>
        Trade
      </button>

      <TransactionModal
        show={showModal}
        onClose={()=>setShowModal(false)}
        ticker={ticker}
        onConfirm={performTransaction}
      />

      {history.length > 0 && (
        <>
          <h3>Price History</h3>
          <StockGraph ticker={ticker} history={history}/>
        </>
      )}

      <Link to="/" className="back-button">← Back</Link>
    </div>
  )
}
