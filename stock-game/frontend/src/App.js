import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import "./styles/global.css";
import "./styles/intervals.css";

// ✅ Providers from index.js (already applied there)
import { useTick } from "./TickProvider";
import { GlobalDataProvider } from "./GlobalDataContext";
import { GameProgressProvider } from "./utils/gameProgressProvider";
import GlobalRefreshManager from "./GlobalRefreshManager";
import AchievementManager from "./utils/AchievementManager";

// 🔻 Layout
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import TickProgressBar from "./components/TickProgressbar";
import TickUpdateOverlay from "./components/TickUpdateOverlay";
import LoadingScreen from "./components/LoadingScreen";
// 🔻 Pages + Panels
import SectorHeatmap from "./components/SectorHeatmap";
import Heatmap from "./components/Heatmap";
import FeaturedStocks from "./components/FeaturedStocks";
import HomeTabs from "./components/HomeTabs";
import MoodGraph from "./components/MoodGraph";
import MarketIndexGraph from "./components/MarketIndexGraph";
import VolatilityGraph from "./components/VolatilityGraph";
import TransactionDashboard from "./components/TransactionDashboard";

import TopStocksPage from "./components/TopStocks";
import TopVolatility from "./components/TopVolatility";
import TopDividends from "./components/TopDividends";
import TopMarketCapStocks from "./components/TopMarketCap";
import FirmsList from "./components/Firms";
import FirmDetail from "./components/FirmDetail";

import StockDetail from "./components/StockDetail";
import Bank from "./components/Bank";
import PortfolioPage from "./components/PortfolioPage";
import Leaderboard from "./components/Leaderboard";
import AchievementPage from "./components/AchievementPage";
import Settings from "./components/Settings";
import NotFound from "./components/NotFoundPage";

// 🔻 Misc Components
import TickerSearch from "./components/TickerSearch";
import RandomStockPicker from "./components/RandomStockPicker";
import AchievementButton from "./components/AchievementButton";
import PortfolioButton from "./components/PortfolioButton";
import MarketMoodOverlay from "./components/MarketMoodOverlay";
import DividendWatcher from "./components/DividendWatcher";
import TutorialModal from "./components/TutorialModal";
import MarketProfileBadge from "./components/MarketProfileBadge";

import { getOrCreateUserId } from "./userId";
import API_BASE_URL from "./apiConfig";

const HeatmapContainer = () => {
  const [selectedSector, setSelectedSector] = useState(null);

  return selectedSector ? (
    <>
      <button className="back-button" onClick={() => setSelectedSector(null)}>
        ⬅ Back to Sectors
      </button>
      <Heatmap sector={selectedSector} />
    </>
  ) : (
    <SectorHeatmap onSectorClick={setSelectedSector} />
  );
};

function AppRoutes() {
  const [bootReady, setBootReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { tick } = useTick();
  const location = useLocation();
  const userId = getOrCreateUserId();

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenTutorial");
    if (!seen) setShowModal(true);
  }, []);

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const isHome = location.pathname === "/";

  return (
    <div className="container relative">
      {isHome && <MarketProfileBadge />}      
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

              <div style={{ marginTop: 24 }}>
                <MoodGraph height={220} compact />
              </div>
              <div style={{ marginTop: 24 }}>
                <MarketIndexGraph height={240} />
                <VolatilityGraph />
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
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <GlobalDataProvider>
      <GameProgressProvider>
        <GlobalRefreshManager />
        <AchievementManager />
        <Router>
          <AppRoutes />
        </Router>
      </GameProgressProvider>
    </GlobalDataProvider>
  );
}