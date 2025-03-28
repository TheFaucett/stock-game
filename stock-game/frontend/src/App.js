import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Heatmap from "./components/Heatmap";
import SectorHeatmap from "./components/SectorHeatmap";
import StockDetail from "./components/StockDetail"; 
import FeaturedStocks from "./components/FeaturedStocks";
import "./styles/global.css";

const queryClient = new QueryClient();

const HeatmapContainer = () => {
    const [selectedSector, setSelectedSector] = useState(null);

    return (
        <div>
            {selectedSector ? (
                <>
                    <button className="back-button"onClick={() => setSelectedSector(null)}>⬅ Back to Sectors</button>
                    <Heatmap sector={selectedSector} />
                </>
            ) : (
                <SectorHeatmap onSectorClick={setSelectedSector} />
            )}
        </div>
    );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="container">
          <Topbar />
          <Sidebar />
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <FeaturedStocks />
                  <HeatmapContainer />
                </>
              }
            />
            <Route path="/stock/:ticker" element={<StockDetail />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}


export default App;
