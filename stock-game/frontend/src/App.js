import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/global.css";

// Tick + Global Data
import { TickProvider } from "./TickProvider";
import { GlobalDataProvider } from "./GlobalDataContext";
import GlobalRefreshManager from "./GlobalRefreshManager";

// Components
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
import TutorialModal from "./components/TutorialModal";
import RandomStockPicker from "./components/RandomStockPicker";
import HomeTabs from "./components/HomeTabs";
import TickerSearch from "./components/TickerSearch";
import TickProgressBar from "./components/TickProgressbar";
import { getOrCreateUserId } from "./userId";
import TickUpdateOverlay from "./components/TickUpdateOverlay";

await getOrCreateUserId();

const queryClient = new QueryClient();

const HeatmapContainer = () => {
  const [selectedSector, setSelectedSector] = useState(null);

  return (
    <div>
      {selectedSector ? (
        <>
          <button
            className="back-button"
            onClick={() => setSelectedSector(null)}
          >
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

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenTutorial");
    if (!seen) {
      setShowModal(true);
    }
  }, []);

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TickProvider>
        <GlobalDataProvider>
          <GlobalRefreshManager />

          <TickUpdateOverlay /> 
          <Router>
            <div className="container">
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
                      <div className="random-picker-center">
                        <RandomStockPicker />
                        <TickerSearch />
                      </div>
                      <HeatmapContainer />
                      <PortfolioButton />
                      <MoodGraph />
                      <MarketIndexGraph />
                      <div style={{ marginTop: "5rem" }}>
                        <TransactionDashboard userId={getOrCreateUserId()} />
                      </div>
                    </>
                  }
                />
                <Route path="/stock/:ticker" element={<StockDetail />} />
                <Route path="/bank" element={<Bank />} />
                <Route
                  path="/transactions"
                  element={
                    <TransactionDashboard userId={getOrCreateUserId()} />
                  }
                />
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
                      formatValue={(s) =>
                        `${(s.dividendYield * 100).toFixed(2)}%`
                      }
                    />
                  }
                />
                <Route
                  path="/top-marketcap"
                  element={
                    <TopMarketCapStocks
                      endpoint="marketcap"
                      title="🏦 Top Market Cap"
                      formatValue={(s) =>
                        `$${(s.marketCap / 1e9).toFixed(2)} B`
                      }
                    />
                  }
                />
                <Route path="/firms" element={<FirmsList />} />
                <Route path="/firms/:name" element={<FirmDetail />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/tutorial" element={<TutorialModal />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
              </Routes>
            </div>
          </Router>
        </GlobalDataProvider>
      </TickProvider>
    </QueryClientProvider>
  );
}

export default App;
