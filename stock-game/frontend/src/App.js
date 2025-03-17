import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Components
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Heatmap from "./components/Heatmap";
import SectorHeatmap from "./components/SectorHeatmap";

import "./styles/global.css";

const queryClient = new QueryClient();

const HeatmapContainer = () => {
    const [selectedSector, setSelectedSector] = useState(null);

    return (
        <div>
            {selectedSector ? (
                <>
                    <button onClick={() => setSelectedSector(null)}>⬅ Back to Sectors</button>
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
      <div className="container">
        <Topbar />
        <Sidebar />
        <HeatmapContainer />
        <div className="content">
          <h1>Stock Market Game</h1>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
