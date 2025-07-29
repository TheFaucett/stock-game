import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "../styles/firms.css";

export default function FirmsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["firms"],
    queryFn: async () => (await axios.get(`${API_BASE_URL}/api/firms`)).data.firms,
  });
  if (isLoading) return <p>Loading firms...</p>;

  return (
    <div className="firms-list-container">
      <h2>AI Firms</h2>
      <div className="firms-card-grid">
        {data.map(firm => (
          <div className="firm-card" key={firm.name}>
            <Link to={`/firms/${encodeURIComponent(firm.name)}`}>
              <div className="firm-card-content">
                <div className="firm-card-title">{firm.name}</div>
                <div className="firm-card-strategy">({firm.strategy})</div>
                <div className="firm-card-balance">Balance: <b>${firm.balance.toLocaleString()}</b></div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
