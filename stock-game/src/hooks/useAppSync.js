import { useEffect } from 'react';

function useAppSync(setStocks, setBalance, setCurrentNews) {
    useEffect(() => {
        const fetchAppState = () => {
            fetch('http://localhost:5000/api/stocks')
                .then((response) => response.json())
                .then((data) => setStocks(data))
                .catch((error) => console.error('Error fetching stocks:', error));

            fetch('http://localhost:5000/api/balance')
                .then((response) => response.json())
                .then((data) => setBalance(data.balance))
                .catch((error) => console.error('Error fetching balance:', error));

            fetch('http://localhost:5000/api/current-news')
                .then((response) => response.json())
                .then((data) => setCurrentNews(data))
                .catch((error) => console.error('Error fetching current news:', error));
        };

        fetchAppState(); // Initial fetch
        const interval = setInterval(fetchAppState, 1000); // Periodic fetch every second

        return () => clearInterval(interval); // Cleanup on unmount
    }, [setStocks, setBalance, setCurrentNews]);
}

export default useAppSync;
