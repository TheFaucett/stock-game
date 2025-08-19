import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./styles/global.css";
import "./styles/intervals.css";
// Providers that are ONLY in index.js (do not wrap again here)
// import { TickProvider } from "./TickProvider";
// import { QueryClientProvider } from "@tanstack/react-query";

import { useTick } from "./TickProvider";
import { GlobalDataProvider } from "./GlobalDataContext";
import GlobalRefreshManager from "./GlobalRefreshManager";
import { GameProgressProvider } from "./utils/gameProgressProvider";
import AchievementManager from "./utils/AchievementManager";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Heatmap from "./components/Heatmap";
import SectorHeatmap from "./components/SectorHeatmap";
import StockDetail from "./components/StockDetail";
import FeaturedStocks from "./components/FeaturedStocks";
import MoodGraph from "./components/MoodGraph";
import MarketIndexGraph from "./components/MarketIndexGraph";
import TopStocksPage from "./components/TopStocks";
import TopVolatility from "./components/TopVolatility";
import TopMarketCapStocks from "./components/TopMarketCap";
import TopDividends from "./components/TopDividends";
import Bank from "./components/Bank";
import TransactionDashboard from "./components/TransactionDashboard";
import Leaderboard from "./components/Leaderboard";
import FirmsList from "./components/Firms";
import FirmDetail from "./components/FirmDetail";
import PortfolioPage from "./components/PortfolioPage";
import PortfolioButton from "./components/PortfolioButton";
import AchievementButton from "./components/AchievementButton";
import TutorialModal from "./components/TutorialModal";
import RandomStockPicker from "./components/RandomStockPicker";
import HomeTabs from "./components/HomeTabs";
import TickerSearch from "./components/TickerSearch";
import TickProgressBar from "./components/TickProgressbar";
import TickUpdateOverlay from "./components/TickUpdateOverlay";
import AchievementPage from "./components/AchievementPage";
import MarketMoodOverlay from "./components/MarketMoodOverlay";
import DividendWatcher from "./components/DividendWatcher";
import NotFound from "./components/NotFoundPage";
import { getOrCreateUserId } from "./userId";

const HeatmapContainer = () => {
  const [selectedSector, setSelectedSector] = useState(null);

  return (
    <div>
      {selectedSector ? (
        <>
          <button className="back-button" onClick={() => setSelectedSector(null)}>
            ⬅ Back to Sectors
          </button>
          <Heatmap sector={selectedSector} />
        </>
      ) : (
        <SectorHeatmap onSectorClick={setSelectedSector} />
      )}
    </div>
  );
};

function App() {
  const [showModal, setShowModal] = useState(false);
  const { tick } = useTick();

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenTutorial");
    if (!seen) setShowModal(true);
  }, []);

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const userId = getOrCreateUserId(); // safe to call (idempotent), no top-level await

  return (
    // ⚠️ Do NOT wrap QueryClientProvider or TickProvider here;
    // they’re already applied in src/index.js
    <GlobalDataProvider>
      <GameProgressProvider>
        <GlobalRefreshManager />
        <AchievementManager />
        <TickUpdateOverlay />
        <Router>
          <div className="container">
            <MarketMoodOverlay />
            <DividendWatcher tick={tick} />
            <Topbar />
            <TickProgressBar />
            <Sidebar />

            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <TutorialModal isOpen={showModal} onClose={handleClose} />
                    <FeaturedStocks />
                    <HomeTabs />

                    <div className="fab-container">
                      <AchievementButton />
                      <PortfolioButton />
                    </div>

                    <div className="random-picker-center">
                      <RandomStockPicker />
                      <TickerSearch />
                    </div>

                    <HeatmapContainer />

                    {/* ✅ Use tail-powered, downsampled charts */}
                    <div style={{ marginTop: 24 }}>
                      <MoodGraph height={220} compact />
                    </div>
                    <div style={{ marginTop: 24 }}>
                      <MarketIndexGraph height={240} />
                    </div>

                    <div style={{ marginTop: "5rem" }}>
                      <TransactionDashboard userId={userId} />
                    </div>
                  </>
                }
              />

              <Route path="/stock/:ticker" element={<StockDetail />} />
              <Route path="/bank" element={<Bank />} />
              <Route path="/transactions" element={<TransactionDashboard userId={userId} />} />
              <Route
                path="/top-movers"
                element={
                  <TopStocksPage
                    endpoint="movers"
                    title="🚀 Top Movers"
                    formatValue={(s) => `${s.change.toFixed(2)}%`}
                  />
                }
              />
              <Route
                path="/top-volatility"
                element={
                  <TopVolatility
                    endpoint="volatility"
                    title="🎢 Most Volatile"
                    formatValue={(s) => `${(s.volatility * 100).toFixed(2)}%`}
                  />
                }
              />
              <Route
                path="/top-dividends"
                element={
                  <TopDividends
                    endpoint="dividends"
                    title="💸 Top Dividend Yield"
                    formatValue={(s) => `${(s.dividendYield * 100).toFixed(2)}%`}
                  />
                }
              />
              <Route
                path="/top-marketcap"
                element={
                  <TopMarketCapStocks
                    endpoint="marketcap"
                    title="🏦 Top Market Cap"
                    formatValue={(s) => `$${(s.marketCap / 1e9).toFixed(2)} B`}
                  />
                }
              />
              <Route path="/firms" element={<FirmsList />} />
              <Route path="/firms/:name" element={<FirmDetail />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/tutorial" element={<TutorialModal />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/achievements" element={<AchievementPage />} />
              <Route path="*" element={<NotFound />}/>
            </Routes>
          </div>
        </Router>
      </GameProgressProvider>
    </GlobalDataProvider>
  );
}

export default App;
