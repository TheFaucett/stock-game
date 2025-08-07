import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../styles/transactionModal.css';
import { useTick } from '../TickProvider';
import API_BASE_URL from '../apiConfig';
import { checkAchievements } from '../utils/checkAchievements';

export default function TransactionModal({ show, onClose, ticker, onConfirm }) {
  const [action, setAction] = useState('');
  const [qty, setQty] = useState('');
  const [strike, setStrike] = useState('');
  const [expiry, setExpiry] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [portfolio, setPortfolio] = useState(null);

  const { tick: currentTick } = useTick();

  useEffect(() => {
    if (!show) return;

    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/portfolio/${localStorage.getItem("userId")}`);
        const data = await res.json();
        setPortfolio(data);
      } catch (err) {
        console.error("❌ Failed to fetch portfolio:", err);
      }
    };

    const fetchPrice = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stocks/${ticker}`);
        const data = await res.json();
        if (data && typeof data.price === 'number') {
          setCurrentPrice(data.price);
          if (action === 'call' || action === 'put') {
            setStrike(data.price.toFixed(2));
          }
        }
      } catch (err) {
        console.error("❌ Failed to fetch stock price:", err);
      }
    };

    fetchPortfolio();
    fetchPrice();
  }, [show, ticker, action]);

  const getQtyPlaceholder = () => {
    if (!currentPrice || !portfolio) return action.match(/call|put/) ? 'Contracts' : 'Shares';

    const balance = portfolio.balance ?? 0;
    const holdings = portfolio.ownedShares?.[ticker] ?? 0;

    switch (action) {
      case 'buy':
        return `Max ${Math.floor(balance / currentPrice)} shares`;
      case 'sell':
        return `Max ${holdings} shares`;
      case 'short':
        return `Max ${Math.floor(balance / currentPrice)} shares (short)`;
      case 'call':
      case 'put': {
        const estPremium = currentPrice * 0.1;
        return `Max ${Math.floor(balance / estPremium)} contracts`;
      }
      default:
        return 'Shares';
    }
  };

  const handleConfirm = async () => {
    const nQty = parseInt(qty, 10);
    if (!action || isNaN(nQty) || nQty <= 0) {
      return alert('Select an action and enter a valid quantity.');
    }

    if (action === 'call' || action === 'put') {
      const fStrike = parseFloat(strike);
      const iExp = parseInt(expiry, 10);
      if (isNaN(fStrike) || isNaN(iExp) || fStrike <= 0 || iExp <= 0) {
        return alert('Enter valid strike price and expiry tick.');
      }
      await onConfirm(action, nQty, fStrike, iExp);
    } else {
      await onConfirm(action, nQty);
    }

    // ✅ Trigger achievements
    if (portfolio) {
      checkAchievements(portfolio, 'trade');
    }

    onClose();
  };

  if (!show) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-container">
        <header className="modal-header">
          <h2>Trade {ticker}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <section className="modal-body">
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px' }}>
            Current Tick: {currentTick}
          </p>

          <div className="action-list">
            {['buy', 'sell', 'short', 'call', 'put'].map(a => (
              <button
                key={a}
                className={`action-btn ${action === a ? 'active' : ''}`}
                onClick={() => {
                  setAction(a);
                  setQty('');
                  setStrike('');
                  setExpiry('');
                }}
              >
                {a.toUpperCase()}
              </button>
            ))}
          </div>

          {action && (
            <div className="input-group">
              <input
                type="number"
                min="1"
                placeholder={getQtyPlaceholder()}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="modal-input"
              />

              {action === 'short' && (
                <input
                  type="number"
                  min="1"
                  placeholder="Expiry Tick"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="modal-input"
                />
              )}

              {(action === 'call' || action === 'put') && (
                <>
                  <div style={{ flex: '1 1 100%' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Strike $"
                      value={strike}
                      onChange={e => setStrike(e.target.value)}
                      className="modal-input"
                    />
                    {currentPrice && (
                      <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                        <button onClick={() => setStrike(currentPrice.toFixed(2))} className="action-btn">ATM</button>
                        <button onClick={() => setStrike((currentPrice * 1.05).toFixed(2))} className="action-btn">+5%</button>
                        <button onClick={() => setStrike((currentPrice * 0.95).toFixed(2))} className="action-btn">-5%</button>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: '1 1 100%' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="Expiry Tick"
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      className="modal-input"
                    />
                    {expiry && (
                      <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                        {expiry - currentTick} ticks from now
                      </p>
                    )}
                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                      {[5, 10, 20].map(inc => (
                        <button key={inc} onClick={() => setExpiry(currentTick + inc)} className="action-btn">
                          +{inc}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <footer className="modal-footer">
          <button className="confirm-btn" onClick={handleConfirm}>
            Confirm
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
