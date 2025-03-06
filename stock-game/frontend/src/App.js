import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

//components
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./styles/global.css";
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container">
        <Topbar />
        <Sidebar />
        <div className="content">
          <h1>Stock Market Game</h1>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
