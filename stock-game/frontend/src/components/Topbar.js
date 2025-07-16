import React, { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import { useTick } from '../TickProvider'; 
import "../styles/topbar.css";


const fetchNews = async () => {
    try {
        const [globalNewsRes, sectorNewsRes, stockNewsRes] = await Promise.all([
            axios.get('http://localhost:5000/api/news/global'),
            axios.get('http://localhost:5000/api/news/sector'),
            axios.get('http://localhost:5000/api/news/stock')
        ]);

        // ✅ Handle stock news properly
        const globalNews = globalNewsRes.data.news || null;
        const sectorNews = sectorNewsRes.data.news || null;
        const stockNews = Array.isArray(stockNewsRes.data.news) && stockNewsRes.data.news.length > 0 
        ? stockNewsRes.data.news[0]  // gets the first element because I provided an array (oopsie)
        : null;

        console.log("🔄 Fetching latest news:", { globalNews, sectorNews, stockNews });

        return { global: globalNews, sector: sectorNews, stock: stockNews };
    } catch (error) {
        console.error("⚠️ Error fetching news:", error);
        return { global: null, sector: null, stock: null };
    }
};

const Topbar = () => {
    const { data: news, isLoading, error, refetch } = useQuery({
        queryKey: ['news'],
        queryFn: fetchNews
    });
    const { tick } = useTick();
    const [isOpen, setIsOpen] = useState(false);
    console.log("🔄 Topbar news:", news);
    useEffect(() => {
        refetch();
    }, [tick, refetch]);


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
                        {news.global ? (
                            <div>
                                <h3>🌎 Global News</h3>
                                <p>{news.global.description} (Sentiment: {news.global.sentimentScore})</p>
                            </div>
                        ) : (
                            <p>🌎 No global news available.</p>
                        )}

                        {news.sector ? (
                            <div>
                                <h3>🏢 Sector News</h3>
                                <p>{news.sector.description} (Sentiment: {news.sector.sentimentScore})</p>
                            </div>
                        ) : (
                            <p>🏢 No sector news available.</p>
                        )}

                        {news.stock ? (
                            <div>
                                <h3>📈 Stock News</h3>
                                <p>{news.stock.description} (Sentiment: {news.stock.sentimentScore})</p>
                            </div>
                        ) : (
                            <p>📈 No stock news available.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Topbar;
