import { useEffect } from "react";
import { useTick } from "./TickProvider";
import { useGlobalData } from "./GlobalDataContext";

export default function GlobalRefreshManager() {
  const { tick } = useTick();
  const { refreshPortfolio, refreshStocks } = useGlobalData();

  useEffect(() => {
    if (tick != null) {
      console.log(`🔄 Refreshing all global data for tick ${tick}`);
      refreshPortfolio();
      refreshStocks();
    }
  }, [tick, refreshPortfolio, refreshStocks]);

  return null; // doesn't render anything
}
