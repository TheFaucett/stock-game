import React, { useState } from "react";
import "../styles/earningsTable.css"; // optional, see CSS below

export default function EarningsTable({ report }) {
  const [open, setOpen] = useState(false);

  if (!report) {
    return (
      <div className="earnings-table-container">
        <p>No earnings report available.</p>
      </div>
    );
  }

  return (
    <div className="earnings-table-container">
      <button
        className="stock-btn trade" // ✅ matches Trade button style
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide Earnings Report" : "Show Earnings Report"}
      </button>

      {open && (
        <table className="earnings-table">
          <tbody>
            <tr>
              <th>Revenue</th>
              <td>${report.revenue}M</td>
            </tr>
            <tr>
              <th>Net Income</th>
              <td>${report.netIncome}M</td>
            </tr>
            <tr>
              <th>EPS</th>
              <td>${report.eps}</td>
            </tr>
            <tr>
              <th>Surprise</th>
              <td>{report.surprise}%</td>
            </tr>
            <tr>
              <th>Market Reaction</th>
              <td>
                {report.marketReaction > 0 ? "+" : ""}
                {report.marketReaction} (
                {(report.marketReactionPct * 100).toFixed(2)}%)
              </td>
            </tr>
            <tr>
              <th>Reported Tick</th>
              <td>{report.tickReported}</td>
            </tr>
            {report.volatility && (
              <tr>
                <th>Volatility (window)</th>
                <td>{report.volatility}%</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
