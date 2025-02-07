const Watchlist = ({ watchlist = [] }) => {
    return (
        <div>
            <h1>Watchlist</h1>
            {watchlist.length > 0 ? (
                <ul>
                    {watchlist.map((ticker, index) => (
                        <li key={index}>{ticker}</li>
                    ))}
                </ul>
            ) : (
                <p>Your watchlist is empty.</p>
            )}
        </div>
    );
};
export default Watchlist;