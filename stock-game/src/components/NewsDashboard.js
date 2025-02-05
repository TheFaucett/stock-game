import React, { useState, useEffect } from "react";
import "../styles/NewsDashboard.css"; // Import the CSS file
import "../styles/global.css";

const NewsDashboard = () => {
  const [news, setNews] = useState({ currentNews: [], pastNews: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 1000); // Fetch news every 30 seconds*
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/news");
      if (!response.ok) {
        throw new Error("Failed to fetch news data");
      }
      const data = await response.json();
      setNews(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const NewsCard = ({ title, description, extra }) => (
    <div className="news-card">
      <h3 className="news-title">{title}</h3>
      <p className="news-description">{description}</p>
      {extra && <p className="news-extra">{extra}</p>}
    </div>
  );

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">News Dashboard</h1>
      {error && <p className="error-message">Error: {error}</p>}

      <div className="current-news-section">
        <h2 className="section-title">Current News</h2>
        {news.currentNews.length > 0 ? (
          news.currentNews.map((item, index) => (
            <NewsCard
              key={index}
              title={`${
                item.type === "global"
                  ? "Global News"
                  : item.type === "sector"
                  ? `Sector News: ${item.sector}`
                  : `Stock News: ${item.ticker}`
              }`}
              description={item.description}
              extra={`Sentiment Score: ${item.sentimentScore}`}
            />
          ))
        ) : (
          <p className="empty-message">No current news available.</p>
        )}
      </div>

      <div className="past-news-section">
        <h2 className="section-title">Past News</h2>
        {news.pastNews.length > 0 ? (
          <div className="past-news-container">
            {news.pastNews.map((item, index) => (
              <NewsCard
                key={index}
                title={`${
                  item.type === "global"
                    ? "Global News"
                    : item.type === "sector"
                    ? `Sector News: ${item.sector}`
                    : `Stock News: ${item.ticker}`
                }`}
                description={item.description}
                extra={`Sentiment Score: ${item.sentimentScore}`}
              />
            ))}
          </div>
        ) : (
          <p className="empty-message">No past news available.</p>
        )}
      </div>
    </div>
  );
};

export default NewsDashboard;
