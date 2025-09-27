import { useQuery } from "@tanstack/react-query";
import API_BASE_URL from "../apiConfig";

export function useMarketProfile() {
  return useQuery({
    queryKey: ["marketProfile"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/market-data/profile`);
      if (!res.ok) throw new Error("Failed to load market profile");
      return res.json(); // expected: { name: "communist" }
    },
    refetchInterval: 10_000, // optional: auto-refresh every 10s
    staleTime: 5_000,
  });
}
