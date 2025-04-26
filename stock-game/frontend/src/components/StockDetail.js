import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockGraph from './StockGraph';
import "../styles/stockdetail.css";

export default function StockDetail() {
  const { ticker } = useParams();
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [shareAmount, setShareAmount] = useState("");

  useEffect(() => {
    const fetchStock = async () => {
      const response = await fetch(`http://localhost:5000/api/stocks`);
      const stocks = await response.json();
      const selected = stocks.find(s => s.ticker === ticker);
      if (selected) setStock(selected);
    };

    const fetchHistory = async () => {
      const response = await fetch(`http://localhost:5000/api/stocks/${ticker}/history`);
      const data = await response.json();
      if (data.history) setHistory(data.history);
    };

    fetchStock();
    fetchHistory();
  }, [ticker]);

  const performTransaction = async () => {
    const userId = "67af822e5609849ac14d7942";
    const type = selectedAction;
    const shares = parseInt(shareAmount);

    if (!type || isNaN(shares) || shares <= 0) return;

    try {
      const res = await fetch(`http://localhost:5000/api/portfolio/${userId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ticker, shares, type })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Transaction failed: ${data.error}`);
      }
        else {
            alert(`Transaction successful: ${data.message}`);
        }

      setSelectedAction(null);
      setShareAmount("");
    } catch (err) {
      console.error("Error in transaction:", err);
      alert("Something went wrong");
    }
  };

  if (!stock) {
    return (
      <div>
        <h2>Stock Not Found</h2>
        <p>{ticker} does not exist.</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>{stock.ticker}</h1>
      <p>Price: ${stock.price.toFixed(2)}</p>
      <p>Change: {stock.change}%</p>
      <p>EPS: {stock.eps}</p>
      <p>Market Cap: ${(stock.price * stock.outstandingShares / 1e9).toFixed(2)}B</p>

      <div className="stock-actions">
        {['buy', 'sell', 'short'].map(action => (
          <React.Fragment key={action}>
            <button
              className={`stock-btn ${action}`}
              onClick={() => {
              if (selectedAction === action) {
                  setSelectedAction(null);
                  setShareAmount("");
              } else {
                  setSelectedAction(action);
                  setShareAmount("");
              }
              }}

            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>

            {selectedAction === action && (
              <>
                <input
                  type="number"
                  min="1"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  className="share-input inline"
                  placeholder="Shares"
                />
                <button className="confirm-btn inline" onClick={performTransaction}>
                  Confirm
                </button>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h3>Price History</h3>
          <StockGraph ticker={ticker} history={history} />
        </>
      )}

      <Link to="/" className="back-button">← Back</Link>
    </div>
  );
}
