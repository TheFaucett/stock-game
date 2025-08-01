import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../styles/transactionModal.css';
import { useTick } from '../TickProvider';
import API_BASE_URL from '../apiConfig';

export default function TransactionModal({ show, onClose, ticker, onConfirm }) {
  const [action, setAction] = useState('');
  const [qty, setQty] = useState('');
  const [strike, setStrike] = useState('');
  const [expiry, setExpiry] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);

  const { tick: currentTick } = useTick();

  // Fetch current stock price when modal opens
  useEffect(() => {
    if (show && (action === 'call' || action === 'put')) {
      fetch(`${API_BASE_URL}/api/stocks/${ticker}`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.price === 'number') {
            setCurrentPrice(data.price);
            setStrike(data.price.toFixed(2)); // default ATM
          }
        })
        .catch(() => {});
    }
  }, [show, action, ticker]);

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
            {['buy','sell','short','call','put'].map(a => (
              <button
                key={a}
                className={`action-btn ${action===a?'active':''}`}
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
                type="number" min="1"
                placeholder={action.match(/call|put/) ? 'Contracts' : 'Shares'}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="modal-input"
              />

              {action === 'short' && (
                <input
                  type="number" min="1"
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
                      type="number" min="0" step="0.01"
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
                      type="number" min="1"
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
                      {[5,10,20].map(inc => (
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
          <button
            className="confirm-btn"
            onClick={async () => {
              const nQty = parseInt(qty, 10);
              if (!action || isNaN(nQty) || nQty <= 0) {
                return alert('Select an action and enter a valid quantity.');
              }

              if (action === 'call' || action === 'put') {
                const fStrike = parseFloat(strike);
                const iExp    = parseInt(expiry, 10);
                if (isNaN(fStrike) || isNaN(iExp) || fStrike <= 0 || iExp <= 0) {
                  return alert('Enter valid strike price and expiry tick.');
                }
                await onConfirm(action, nQty, fStrike, iExp);
              } else {
                await onConfirm(action, nQty);
              }

              onClose();
            }}
          >
            Confirm
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
