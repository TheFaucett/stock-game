import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import FirmBalanceGraph from "./FirmBalanceGraph"
import "../styles/firmDetail.css";  // Import your new css

export default function FirmDetail() {
  const { name } = useParams();
  const enabled = !!name;  // Only run query if name is defined!
  const { data, isLoading, error } = useQuery({
  queryKey: ["firm", name],
  queryFn: async () => (await axios.get(`http://localhost:5000/api/firms/${encodeURIComponent(name)}`)).data.firm,
  enabled,
  });
  if (!name) {
    return <div style={{ color: 'red' }}>Firm name missing</div>;
  }
  if (isLoading) return <p>Loading...</p>;
  if (error || !data) return <p>Firm not found.</p>;
  const firm = data;

  return (
    <div className="firm-detail-container">
      <Link to="/firms" className="firm-detail-back">
        &larr; Back to Firms
      </Link>


      <FirmBalanceGraph name={firm.name} />
      <div className="firm-detail-strategy">Strategy: <span>{firm.strategy}</span></div>
      <div className="firm-detail-balance">Balance: <span>${firm.balance.toLocaleString()}</span></div>
      <div className="firm-detail-transactions">
        <h3>Recent Transactions</h3>
        <ul>
          {(firm.transactions || []).slice(-20).reverse().map((t, idx) => (
            <li key={idx}>
              [{new Date(t.date).toLocaleString()}]{" "}
              <b>{t.type}</b> {t.shares} <b>{t.ticker}</b> @ ${t.price.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
