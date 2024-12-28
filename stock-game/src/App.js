import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StockDetail from './StockDetail.js'; // Create this component for stock details


function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(0);



    function handleTransaction(type, amount, ticker) { // type is 'buy' or 'sell', amount is the transaction value
    fetch('http://localhost:5000/api/balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, amount, ticker }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log('New balance:', data.balance)
            setBalance(data.balance)
            })
        .catch((error) => console.error('Error updating balance:', error));
    }


    useEffect(() => {
        fetch('http://localhost:5000/api/balance') // Fetch from the backend
          .then((response) => response.json())
          .then((data) => setBalance(data.balance)) // Store the balance in state
          .catch((error) => console.error('Error fetching balance:', error));
    }, []);
    console.log("Balance:", balance);
    useEffect(() => {
        fetch('http://localhost:5000/api/stocks') // Fetch from the backend
          .then((response) => response.json())
          .then((data) => setStocks(data)) // Store the stock data in state
          .catch((error) => console.error('Error fetching stocks:', error));
    }, []);


    const handleBuy = (ticker) => {
        const amount = prompt("Enter the number of shares to buy: ");
        if (amount) {
            handleTransaction('buy', parseInt(amount), ticker);
            //console.log(balance);
        }
    }
    const handleSell = ticker => {
        const amount = prompt("Enter the number of shares to sell: ");
        if (amount) {
            handleTransaction('sell', parseInt(amount), ticker);
            //console.log(balance);
        }
    }

  return (
    <div className="App">
      <h1>Stock List</h1>
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Price</th>
            <th>Change (%)</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.ticker}>
              <td>{stock.ticker}</td>
              <td>${stock.price.toFixed(2)}</td>
              <td style={{ color: stock.change > 0 ? 'green' : 'red' }}>
                {stock.change}%
              </td>
              <td>
                <button onClick={() => handleBuy(stock.ticker)}>Buy</button>
                <button onClick={() => handleSell(stock.ticker)}>Sell</button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

        <BrowserRouter>
            <Routes>
                <Route path='/stock/:ticker' element={<StockDetail />} />
            </Routes>
        </BrowserRouter>



    </div>
  );
}

export default App;