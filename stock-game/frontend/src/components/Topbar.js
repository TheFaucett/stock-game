// src/components/Topbar.js

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTick } from "../TickProvider";
import DailyQuestBanner from "./DailyQuestBanner";
import API_BASE_URL from "../apiConfig";
import { getOrCreateUserId } from "../userId";
import "../styles/topbar.css";

const fetchNews = async () => {
  try {
    const [globalNewsRes, sectorNewsRes, stockNewsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/news/global`),
      axios.get(`${API_BASE_URL}/api/news/sector`),
      axios.get(`${API_BASE_URL}/api/news/stock`)
    ]);

    const globalNews = globalNewsRes.data.news || null;
    const sectorNews = sectorNewsRes.data.news || null;
    const stockNews =
      Array.isArray(stockNewsRes.data.news) && stockNewsRes.data.news.length > 0
        ? stockNewsRes.data.news[0]
        : null;

    return { global: globalNews, sector: sectorNews, stock: stockNews };
  } catch (error) {
    console.error("⚠️ Error fetching news:", error);
    return { global: null, sector: null, stock: null };
  }
};

const Topbar = () => {
  const { tick } = useTick();
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: news,
    isLoading: loadingNews,
    error: errorNews,
    refetch
  } = useQuery({
    queryKey: ["news"],
    queryFn: fetchNews
  });

  const {
    data: portfolio,
    isLoading: loadingPortfolio,
    error: errorPortfolio
  } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const userId = getOrCreateUserId();
      const res = await axios.get(`${API_BASE_URL}/api/portfolio/${userId}`);
      return res.data;
    }
  });

  const {
    data: stocks,
    isLoading: loadingStocks,
    error: errorStocks
  } = useQuery({
    queryKey: ["stocks"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/stocks`);
      return res.data.stocks || res.data || [];
    }
  });

  useEffect(() => {
    refetch();
  }, [tick, refetch]);

  useEffect(() => {
    console.log("🧪 TICK:", tick);
    console.log("🧪 portfolio:", portfolio);
    console.log("🧪 stocks:", stocks);

    if (errorPortfolio) {
      console.error("❌ Portfolio load error:", errorPortfolio);
    }
    if (errorStocks) {
      console.error("❌ Stock list load error:", errorStocks);
    }
  }, [tick, portfolio, stocks, errorPortfolio, errorStocks]);

  return (
    <div className={`topbar-container ${isOpen ? "open" : "closed"}`}>
      <button className="toggle-btn-top" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "▲" : "▼"}
      </button>

      <div className="topbar">
        <h2>Market News</h2>

        {loadingNews || loadingPortfolio || loadingStocks ? (
          <p>Loading market data...</p>
        ) : errorNews ? (
          <p>Error fetching news.</p>
        ) : (
          <div className="news-content">
            {/* 🌍 Global */}
            {news?.global ? (
              <div>
                <h3>🌎 Global News</h3>
                <p>
                  {news.global.description} (Sentiment:{" "}
                  {news.global.sentimentScore})
                </p>
              </div>
            ) : (
              <p>🌎 No global news available.</p>
            )}

            {/* 🏢 Sector */}
            {news?.sector ? (
              <div>
                <h3>🏢 Sector News</h3>
                <p>
                  {news.sector.description} (Sentiment:{" "}
                  {news.sector.sentimentScore})
                </p>
              </div>
            ) : (
              <p>🏢 No sector news available.</p>
            )}

            {/* 📈 Stock */}
            {news?.stock ? (
              <div>
                <h3>📈 Stock News</h3>
                <p>
                  {news.stock.description} (Sentiment:{" "}
                  {news.stock.sentimentScore})
                </p>
              </div>
            ) : (
              <p>📈 No stock news available.</p>
            )}

            {/* ✅ Daily Quest Banner (only when expanded & loaded) */}
            {!loadingPortfolio &&
              !loadingStocks &&
              isOpen &&
              portfolio &&
              Array.isArray(stocks) &&
              stocks.length > 0 && (
                <DailyQuestBanner portfolio={portfolio} stocks={stocks} />
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
