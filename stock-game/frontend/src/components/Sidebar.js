// src/components/Sidebar.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import StockGraph from './StockGraph';
import PortfolioBalanceGraph from './PortfolioBalanceGraph';
import '../styles/sidebar.css';
import { getOrCreateUserId } from '../userId';
const USER_ID = getOrCreateUserId();

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

  // Best & Worst Performer
  const { bestPerformer, worstPerformer } = useMemo(() => {
    if (!portfolio?.transactions || !portfolio?.ownedShares) return {}

    const ownedTickers = Object.keys(portfolio.ownedShares)

    const performance = ownedTickers.map(ticker => {
      const txs = portfolio.transactions.filter(
        tx =>
          tx.ticker === ticker &&
          (tx.type === 'buy' || tx.type === 'sell')
      )

      const totalShares = txs
        .filter(tx => tx.type === 'buy')
        .reduce((sum, tx) => sum + tx.shares, 0) -
        txs
          .filter(tx => tx.type === 'sell')
          .reduce((sum, tx) => sum + tx.shares, 0)

      if (totalShares <= 0) return null

      const totalCost = txs
        .filter(tx => tx.type === 'buy')
        .reduce((sum, tx) => sum + tx.price * tx.shares, 0)

      const avgCost = totalCost / (totalShares || 1)

      const currentPrice =
        portfolio.currentPrices?.[ticker] ?? avgCost // fallback

      const pctChange = ((currentPrice - avgCost) / avgCost) * 100

      return { ticker, pctChange, currentPrice }
    }).filter(Boolean)

    const bestPerformer = performance.reduce(
      (best, stock) =>
        best == null || stock.pctChange > best.pctChange ? stock : best,
      null
    )
    const worstPerformer = performance.reduce(
      (worst, stock) =>
        worst == null || stock.pctChange < worst.pctChange ? stock : worst,
      null
    )

    return { bestPerformer, worstPerformer }
  }, [portfolio])

  // Recent Positions
  const recentPositions = useMemo(() => {
    if (!portfolio?.transactions) return []

    const txs = [...portfolio.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter(tx => ['short', 'cover', 'call', 'put'].includes(tx.type))
      .slice(0, 4)

    return txs.map(tx => {
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
          profit = tx.type === 'short'
            ? (tx.price - counterpart.price) * tx.shares
            : (counterpart.price - tx.price) * counterpart.shares
        }

        return {
          ...tx,
          displayType: tx.type === 'short' ? 'Short' : 'Cover',
          isOpen,
          profit
        }
      }

      // calls / puts
      const isOpen = !tx.expired
      let profit = null
      if (tx.expired) {
        const expireTx = portfolio.transactions.find(e =>
          (e.type === 'call_expire' || e.type === 'put_expire') &&
          e.ticker === tx.ticker &&
          e.expiryTick === tx.expiryTick &&
          new Date(e.date) > new Date(tx.date)
        )
        if (expireTx) profit = expireTx.total - tx.total
      }

      return {
        ...tx,
        displayType: tx.type.toUpperCase(),
        isOpen,
        profit
      }
    })
  }, [portfolio])

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="toggle-btn"
        onClick={() => setIsOpen(o => !o)}
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
                ([tkr, sh]) => <li key={tkr}>{tkr}: {sh} shares</li>
              )}
            </ul>
          </div>
        )}

        <h3>Portfolio History</h3>
        <PortfolioBalanceGraph size="small"/>

        <h3>Most Valuable Stock</h3>
        {portfolio?.ownedShares &&
          Object.keys(portfolio.ownedShares).length > 0 ? (
          <div className="card">
            {(() => {
              const [bestTicker, bestShares] = Object.entries(
                portfolio.ownedShares
              ).reduce((max, s) => s[1] > max[1] ? s : max, ['', 0])
              return (
                <>
                  <p>{bestTicker}: {bestShares} shares</p>
                  <StockGraph ticker={bestTicker} />
                  <div style={{ height: '5em' }}></div>
                </>
              )
            })()}
          </div>
        ) : (
          <p>No stocks owned yet.</p>
        )}

        <h3>Best Performer</h3>
        {bestPerformer ? (
          <div className="card">
            <p><strong>{bestPerformer.ticker}</strong></p>
            <p style={{ color: bestPerformer.pctChange >= 0 ? 'lime' : 'red' }}>
              {bestPerformer.pctChange.toFixed(2)}%
            </p>
          </div>
        ) : <p>No stocks owned.</p>}

        <h3>Biggest Loser</h3>
        {worstPerformer ? (
          <div className="card">
            <p><strong>{worstPerformer.ticker}</strong></p>
            <p style={{ color: worstPerformer.pctChange >= 0 ? 'lime' : 'red' }}>
              {worstPerformer.pctChange.toFixed(2)}%
            </p>
          </div>
        ) : <p>No stocks owned.</p>}

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
                      <span style={{ color: pos.profit >= 0 ? 'lime' : 'red' }}>
                        {pos.profit >= 0
                          ? `Profit: $${pos.profit.toFixed(2)}`
                          : `Loss: $${Math.abs(pos.profit).toFixed(2)}`}
                      </span>
                    )
                  ) : (
                    pos.isOpen ? (
                      <span style={{ color: 'orange' }}>Unexercised</span>
                    ) : pos.profit != null ? (
                      <span style={{ color: pos.profit >= 0 ? 'lime' : 'red' }}>
                        Expired (P/L: $${pos.profit.toFixed(2)})
                      </span>
                    ) : (
                      <span style={{ color: '#aaa' }}>Expired</span>
                    )
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
