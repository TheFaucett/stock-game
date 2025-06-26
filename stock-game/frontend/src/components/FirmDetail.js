import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function FirmDetail() {
  const { name } = useParams();
  console.log("name", name)
  const { data, isLoading, error } = useQuery({
    queryKey: ["firm", name],
    queryFn: async () => (await axios.get(`http://localhost:5000/api/firms/${encodeURIComponent(name)}`)).data.firm,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error || !data) return <p>Firm not found.</p>;
  const firm = data;

  return (
    <div>
      <Link to="/firms">&larr; Back to Firms</Link>
      <h2>{firm.name}</h2>
      <p>Strategy: {firm.strategy}</p>
      <p>Balance: ${firm.balance.toLocaleString()}</p>
      <h3>Recent Transactions</h3>
      <ul>
        {(firm.transactions || []).slice(-20).reverse().map((t, idx) => (
          <li key={idx}>
            [{new Date(t.date).toLocaleString()}] {t.type} {t.shares} {t.ticker} @ ${t.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
