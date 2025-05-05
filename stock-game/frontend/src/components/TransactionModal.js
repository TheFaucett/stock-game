import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import '../styles/transactionModal.css';

export default function TransactionModal({ show, onClose, ticker, onConfirm }) {
  const [action, setAction] = useState('')
  const [qty, setQty]       = useState('')
  const [strike, setStrike] = useState('')
  const [expiry, setExpiry] = useState('')
  console.log("I RUN ");
  if (!show) return null

  // We render the modal into document.body so it isn’t constrained
  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-container">
        <header className="modal-header">
          <h2>Trade {ticker}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <section className="modal-body">
          <div className="action-list">
            {['buy','sell','short','call','put'].map(a => (
              <button
                key={a}
                className={`action-btn ${action===a?'active':''}`}
                onClick={()=>{ setAction(a); setQty(''); setStrike(''); setExpiry('') }}
              >
                {a.toUpperCase()}
              </button>
            ))}
          </div>

          {action && (
            <div className="input-group">
              <input
                type="number" min="1" placeholder={action.match(/call|put/) ? 'Contracts' : 'Shares'}
                value={qty} onChange={e=>setQty(e.target.value)} className="modal-input"
              />
              {action==='short' && (
                <input
                  type="number" min="1" placeholder="Expiry Tick"
                  value={expiry} onChange={e=>setExpiry(e.target.value)} className="modal-input"
                />
              )}
              {action.match(/call|put/) && (
                <>
                  <input
                    type="number" min="0" step="0.01" placeholder="Strike $"
                    value={strike} onChange={e=>setStrike(e.target.value)} className="modal-input"
                  />
                  <input
                    type="number" min="1" placeholder="Expiry Tick"
                    value={expiry} onChange={e=>setExpiry(e.target.value)} className="modal-input"
                  />
                </>
              )}
            </div>
          )}
        </section>

        <footer className="modal-footer">
          <button className="confirm-btn" onClick={async () => {
            const nQty = parseInt(qty,10)
            if (!action || isNaN(nQty)||nQty<=0) {
              return alert('Select action + valid qty')
            }
            if (action.match(/call|put/)) {
              const fStrike = parseFloat(strike)
              const iExp    = parseInt(expiry,10)
              if (isNaN(fStrike)||isNaN(iExp)||fStrike<=0||iExp<=0)
                return alert('Valid strike & expiry required')
              await onConfirm(action,nQty,fStrike,iExp)
            } else {
              await onConfirm(action,nQty)
            }
            onClose()
          }}>
            Confirm
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
