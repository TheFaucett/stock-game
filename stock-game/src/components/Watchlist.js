const Watchlist = ({ stocks = [], watchlist = [], onRemoveFromWatchlist = () => {} }) => {
    return (
        <div>
            <h1>Watchlist</h1>
            {watchlist.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Price</th>
                            <th>Change (%)</th>
                            <th>P/E Ratio</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {watchlist.map((ticker) => {
                            const stock = stocks.find((s) => s.ticker === ticker);
                            if (!stock) return null;
                            return (
                                <tr key={stock.ticker}>
                                    <td>{stock.ticker}</td>
                                    <td>${stock.price.toFixed(2)}</td>
                                    <td
                                        style={{
                                            color: stock.change > 0 ? 'green' : 'red',
                                        }}
                                    >
                                        {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
                                    </td>
                                    <td>{stock.peRatio ? stock.peRatio.toFixed(2) : 'N/A'}</td>
                                    <td>
                                        <button onClick={() => onRemoveFromWatchlist(stock.ticker)}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p>Your watchlist is empty.</p>
            )}
        </div>
    );
};

export default Watchlist;