import React from "react";
import { useQuery } from "@tanstack/react-query";
import "../styles/leaderboard.css";
import API_BASE_URL from "../apiConfig";
export default function Leaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await fetch(`${API_BASE_URL}/api/leaderboard`)).json(),
    refetchInterval: 15000 // auto-update every 15s
  });

  if (isLoading) return <p>Loading leaderboard…</p>;
  if (error || !data) return <p>Leaderboard unavailable.</p>;

  return (
    <div className="leaderboard">
      <h2>🏆 Top Players by Net Worth</h2>


      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Net Worth</th>
            <th>Cash</th>
            <th>Stocks</th>
          </tr>
        </thead>
        <tbody>
        {data.leaderboard
            .filter(p => typeof p.netWorth === "number" && typeof p.balance === "number" && typeof p.stockValue === "number")
            .map((p, idx) => (
            <tr key={p.userId} className={p.isYou ? "you" : ""}>
                <td>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}</td>
                <td>{p.userId}</td>
                <td>${(p.netWorth ?? 0).toLocaleString()}</td>
                <td>${(p.balance ?? 0).toLocaleString()}</td>
                <td>${(p.stockValue ?? 0).toLocaleString()}</td>
            </tr>
            ))}
        </tbody>

      </table>
    </div>
  );
}
