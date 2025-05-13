// src/components/Sidebar.jsx
import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import StockGraph from './StockGraph'
import PortfolioBalanceGraph from './PortfolioBalanceGraph'
import '../styles/sidebar.css'

const USER_ID = '67af822e5609849ac14d7942'

const fetchPortfolio = async () => {
  const { data } = await axios.get(
    `http://localhost:5000/api/portfolio/${USER_ID}`
  )
  return data
}

export default function Sidebar() {
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolio', USER_ID],
    queryFn: fetchPortfolio,
    refetchInterval: 10_000
  })
  const [isOpen, setIsOpen] = useState(false)

  const recentPositions = useMemo(() => {
    if (!portfolio?.transactions) return []

    // pick last 4 trades of interest
    const txs = [...portfolio.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter(tx =>
        ['short', 'cover', 'call', 'put'].includes(tx.type)
      )
      .slice(0, 4)

    return txs.map(tx => {
      // short / cover: compute P/L
      if (tx.type === 'short' || tx.type === 'cover') {
        let counterpart
        if (tx.type === 'short') {
          counterpart = portfolio.transactions.find(c =>
            c.type === 'cover' &&
            c.ticker === tx.ticker &&
            new Date(c.date) > new Date(tx.date)
          )
        } else {
          counterpart = portfolio.transactions.find(c =>
            c.type === 'short' &&
            c.ticker === tx.ticker &&
            new Date(c.date) < new Date(tx.date)
          )
        }

        const isOpen = tx.type === 'short' && !counterpart
        let profit = null
        if (counterpart) {
          if (tx.type === 'short') {
            profit = (tx.price - counterpart.price) * tx.shares
          } else {
            profit = (counterpart.price - tx.price) * counterpart.shares
          }
        }

        return {
          ...tx,
          displayType: tx.type === 'short' ? 'Short' : 'Cover',
          isOpen,
          profit
        }
      }

      // call / put: find corresponding expire record (if any)
      const isOpen = !tx.expired
      let profit = null
      if (tx.expired) {
        const expireTx = portfolio.transactions.find(e =>
          (e.type === 'call_expire' || e.type === 'put_expire') &&
          e.ticker === tx.ticker &&
          e.expiryTick === tx.expiryTick &&
          new Date(e.date) > new Date(tx.date)
        )
        if (expireTx) {
          // expireTx.total is payoff, tx.total is premium paid
          profit = expireTx.total - tx.total
        }
      }

      return {
        ...tx,
        displayType: tx.type.toUpperCase(), // "CALL" or "PUT"
        isOpen,
        profit
      }
    })
  }, [portfolio])

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="toggle-btn"
        onClick={() => setIsOpen(open => !open)}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      <aside className="sidebar">
        <h2>Your Portfolio</h2>
        {isLoading && <p>Loading portfolio...</p>}
        {error && <p>Error fetching portfolio.</p>}
        {portfolio && (
          <div className="card">
            <p><strong>Balance:</strong> ${portfolio.balance.toFixed(2)}</p>
            <p><strong>Stocks Owned:</strong></p>
            <ul>
              {Object.entries(portfolio.ownedShares).map(
                ([ticker, shares]) => (
                  <li key={ticker}>
                    {ticker}: {shares} shares
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        <h3>Portfolio History</h3>
        <PortfolioBalanceGraph />

        <h3>Most Valuable Stock</h3>
        {portfolio?.ownedShares &&
        Object.keys(portfolio.ownedShares).length > 0 ? (
          <div className="card">
            {(() => {
              const mostValuable = Object.entries(
                portfolio.ownedShares
              ).reduce(
                (max, s) => (s[1] > max[1] ? s : max),
                ['', 0]
              )
              const [ticker, shares] = mostValuable
              return (
                <>
                  <p>{ticker}: {shares} shares</p>
                  <StockGraph ticker={ticker} />
                </>
              )
            })()}
          </div>
        ) : (
          <p>No stocks owned yet.</p>
        )}

        <h3>Recent Positions</h3>
        <div className="card">
          {recentPositions.length === 0 ? (
            <p>No recent shorts or options.</p>
          ) : (
            <ul>
              {recentPositions.map((pos, i) => (
                <li key={i}>
                  <strong>{pos.ticker}</strong> — {pos.displayType}
                  <br />
                  {['Short','Cover'].includes(pos.displayType)
                    ? `${pos.shares} shares @ $${pos.price.toFixed(2)}`
                    : `${pos.contracts} contracts @ $${pos.price.toFixed(2)} premium`}
                  <br />
                  {['Short','Cover'].includes(pos.displayType) ? (
                    pos.isOpen ? (
                      <span style={{ color: 'orange' }}>Open</span>
                    ) : (
                      <span style={{
                        color: pos.profit >= 0 ? 'lightgreen' : 'salmon'
                      }}>
                        {pos.profit >= 0
                          ? `Profit: $${pos.profit.toFixed(2)}`
                          : `Loss: $${Math.abs(pos.profit).toFixed(2)}`}
                      </span>
                    )
                  ) : (
                    <span style={{ color: pos.isOpen ? 'orange' : '#aaa' }}>
                      {pos.isOpen ? 'Unexercised' : 'Expired'}
                      {pos.profit != null && !pos.isOpen
                        ? ` (P/L: $${pos.profit.toFixed(2)})`
                        : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
