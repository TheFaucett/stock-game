import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from './PageWrapper';
import '../styles/stockListPage.css';
const StockListPage = ({ stocks }) => {
    return (


            <div className="stock-list-container">
                <h1>All Stocks</h1>
                <table className="stock-list-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Price</th>
                            <th>Change (%)</th>
                            <th>P/E Ratio</th>
                            <th>Sector</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map((stock) => (
                            <tr key={stock.ticker}>
                                <td>
                                    <Link to={`/stock/${stock.ticker}`} className="stock-link">
                                        {stock.ticker}
                                    </Link>
                                </td>
                                <td>${stock.price.toFixed(2)}</td>
                                <td className={stock.change > 0 ? 'positive-change' : 'negative-change'}>
                                    {stock.change > 0 ? '+' : ''}
                                    {stock.change.toFixed(2)}%
                                </td>
                                <td>{stock.peRatio || 'N/A'}</td>
                                <td>{stock.sector}</td>
                                <td>
                                    <Link to={`/stock/${stock.ticker}`}>
                                        <button className="view-details-button">View Details</button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>



    );
};

export default StockListPage;
