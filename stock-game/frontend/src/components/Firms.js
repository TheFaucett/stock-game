import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function FirmsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["firms"],
    queryFn: async () => (await axios.get("http://localhost:5000/api/firms")).data.firms,
  });
  if (isLoading) return <p>Loading firms...</p>;

  return (
    <div>
      <h2>AI Firms</h2>
      <ul>
        {data.map(firm => (
          <li key={firm.name}>
            <Link to={`/firms/${encodeURIComponent(firm.name)}`}>
              {firm.name} ({firm.strategy}) – Balance: ${firm.balance.toLocaleString()}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
