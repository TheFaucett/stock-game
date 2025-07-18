import React from "react";
import { Link } from "react-router-dom";
import "../styles/homeTabs.css";

export default function FolderTabs() {
  return (
    <nav className="folder-tabs-floating">
      <Link className="folder-tab" to="/firms">Firms</Link>
      <Link className="folder-tab" to="/bank">Bank</Link>
    </nav>
  );
}
