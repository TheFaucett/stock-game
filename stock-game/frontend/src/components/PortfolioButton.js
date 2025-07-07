
import React from "react";
import { Link } from "react-router-dom";
import "../styles/portfolioButton.css"; // see CSS below

export default function PortfolioButton() {
  return (
    <Link to="/portfolio" className="fab-portfolio">
    💼
    </Link>

  );
}
