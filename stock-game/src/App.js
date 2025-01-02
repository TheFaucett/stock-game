import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StockDetail from './components/StockDetail';
import useAppSync from './hooks/useAppSync';

function App() {
    const [stocks, setStocks] = useState([]);
    const [balance, setBalance] = useState(() => {
        const savedBalance = localStorage.getItem('balance');
        return savedBalance ? parseFloat(savedBalance) : 10000;
    });

    const [ownedShares, setOwnedShares] = useState(() => {
        const savedShares = localStorage.getItem('ownedShares');
        return savedShares ? JSON.parse(savedShares) : {};
    });
    console.log({ ownedShares, balance});
    const [currentNews, setCurrentNews] = useState(null);


    useAppSync(setStocks, setBalance, setCurrentNews);


    useEffect(() => {
        const syncStateWithBackend = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/sync-shares', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ownedShares }),
                });
                if (!response.ok) {
                    throw new Error('Failed to sync owned shares with backend');
                }
                console.log('Owned shares synced with backend successfully');
            } catch (error) {
                console.error('Error syncing owned shares with backend:', error);
            }
        };

        syncStateWithBackend();
    }, []); // Sync only on component mount


    useEffect(() => {
        localStorage.setItem('balance', balance);
    }, [balance]);

    useEffect(() => {
        localStorage.setItem('ownedShares', JSON.stringify(ownedShares));
    }, [ownedShares]);


    function handleTransaction(type, amount, ticker) {
        const stock = stocks.find((s) => s.ticker === ticker);
        if (!stock) return alert('Stock not found!');
        
        const transactionAmount = amount * stock.price;

        fetch('http://localhost:5000/api/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, amount, ticker }),
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json();
                }
                return response.json();
            })
            .then((data) => {
                setBalance(data.balance); // Update balance immediately
                setOwnedShares((prevShares) => {
                    const updatedShares = { ...prevShares };
                    if (type === 'buy') {
                        updatedShares[ticker] = (updatedShares[ticker] || 0) + amount;
                    } else if (type === 'sell') {
                        updatedShares[ticker] -= amount;
                        if (updatedShares[ticker] <= 0) {
                            delete updatedShares[ticker];
                        }
                    }
                    return updatedShares;
                });


                fetch('http://localhost:5000/api/sync-shares', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ownedShares }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Failed to sync updated shares with backend');
                        }
                        console.log('Owned shares updated and synced with backend');
                    })
                    .catch((error) => console.error('Error syncing owned shares after transaction:', error));
            })
            .catch((error) => {
                console.error('Error processing transaction:', error);
            });
    }


    const StockList = () => (
        <div>
            <h1>Stock List</h1>
            <p>Balance: ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}</p>
            {currentNews && (
                <div style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
                    <h3>Current News:</h3>
                    <p>
                        <strong>{currentNews.ticker}</strong>: {currentNews.description}
                    </p>
                </div>
            )}
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Price</th>
                        <th>Change (%)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map((stock) => (
                        <tr key={stock.ticker}>
                            <td>
                                <Link
                                    to={`/stock/${stock.ticker}`}
                                    style={{
                                        color: stock.change > 0 ? 'green' : 'red',
                                        textDecoration: 'none',
                                    }}
                                >
                                    {stock.ticker}
                                </Link>
                            </td>
                            <td>${typeof stock.price === 'number' ? stock.price.toFixed(2) : '0.00'}</td>
                            <td
                                style={{
                                    color: stock.change > 0 ? 'green' : 'red',
                                }}
                            >
                                {stock.change > 0 ? '+' : ''}
                                {typeof stock.change === 'number' ? stock.change.toFixed(2) : '0.00'}%
                            </td>
                            <td>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to buy: ');
                                        if (amount) handleTransaction('buy', parseInt(amount), stock.ticker);
                                    }}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => {
                                        const amount = prompt('Enter the number of shares to sell: ');
                                        if (amount) handleTransaction('sell', parseInt(amount), stock.ticker);
                                    }}
                                >
                                    Sell
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StockList />} />
                <Route path="/stock/:ticker" element={<StockDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
