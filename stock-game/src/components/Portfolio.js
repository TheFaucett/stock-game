import React, { useEffect, useState } from 'react';
import '../styles/global.css';

const Portfolio = () => {
    const [portfolio, setPortfolio] = useState({
        balance: 0,
        ownedShares: {},
        transactions: [],
    });

    useEffect(() => {
        fetch('http://localhost:5000/api/portfolio')
            .then((response) => response.json())
            .then((data) => {
                // Filter out stocks with 0 shares
                const filteredShares = Object.fromEntries(
                    Object.entries(data.ownedShares).filter(([_, shares]) => shares > 0)
                );
                setPortfolio({ ...data, ownedShares: filteredShares });
            })
            .catch((error) => console.error('Error fetching portfolio:', error));
    }, []);

    return (
        <div>
            <h1>Portfolio</h1>
            <h2>Balance: ${portfolio.balance.toFixed(2)}</h2>

            <h3>Owned Shares:</h3>
            {Object.keys(portfolio.ownedShares).length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Shares</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(portfolio.ownedShares).map(([ticker, shares]) => (
                            <tr key={ticker}>
                                <td>{ticker}</td>
                                <td>{shares}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>You do not own any shares.</p>
            )}

            <h3>Transaction History:</h3>
            {portfolio.transactions.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Ticker</th>
                            <th>Shares</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portfolio.transactions.map((transaction, index) => (
                            <tr key={index}>
                                <td>{new Date(transaction.date).toLocaleString()}</td>
                                <td>{transaction.type}</td>
                                <td>{transaction.ticker}</td>
                                <td>{transaction.shares}</td>
                                <td>${transaction.price.toFixed(2)}</td>
                                <td>${transaction.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No transaction history available.</p>
            )}
        </div>
    );
};

export default Portfolio;
