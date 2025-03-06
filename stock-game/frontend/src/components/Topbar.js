import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import "../styles/topbar.css";

const fetchNews = async () => {
    const globalNews = await axios.get('http://localhost:5000/api/news/global');
   // const sectorNews = await axios.get('http://localhost:5000/api/news/sector');
    const stockNews = await axios.get('http://localhost:5000/api/news/stock');

    return {
        global: globalNews.data.news, // Adjusted to match API response
      //  sector: sectorNews.data.news, // Assuming a similar response structure
        stock: stockNews.data.news,  // Assuming a similar response structure
    };
};

const Topbar = () => {
    const { data: news, isLoading, error } = useQuery({
        queryKey: ['news'],
        queryFn: fetchNews
    });

    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={`topbar-container ${isOpen ? 'open' : 'closed'}`}>
            <button className="toggle-btn-top" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '▲' : '▼'}
            </button>
            <div className="topbar">
                <h2>Market News</h2>
                {isLoading && <p>Loading news...</p>}
                {error && <p>Error fetching news.</p>}
                {news && (
                    <div className="news-content">
                        <h3>🌎 Global News</h3>
                        <ul>
                            {news.global.map((item) => (
                                <li key={item._id}>{item.description} (Sentiment: {item.sentimentScore})</li>
                            ))}
                        </ul>

                        <h3>🏢 Sector News</h3>
                        <ul>
                            {/*news.sector.map((item) => (
                               <li key={item._id}>{item.description} (Sentiment: {item.sentimentScore})</li>
                            ))*/}
                        </ul>

                        <h3>📈 Stock News</h3>
                        <ul>
                            {news.stock.map((item) => (
                                <li key={item._id}>{item.description} (Sentiment: {item.sentimentScore})</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Topbar;
