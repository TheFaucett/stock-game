import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/Sidebar";
import "./styles/global.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container">
        <Sidebar />
        <div className="content">
          <h1>Stock Market Game</h1>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
