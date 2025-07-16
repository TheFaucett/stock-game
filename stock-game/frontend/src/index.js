import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { TickProvider } from "./TickProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "chartjs-adapter-date-fns";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  TimeScale,
  Filler
} from "chart.js";

/* 🏷️ one-time element registration */
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  TimeScale,
  Filler
);

/* 🔄 shared React-Query client */
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>

      <TickProvider>
        <App />
      </TickProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
