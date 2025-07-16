// src/components/FolderTabs.jsx
import React from "react";
import "../styles/homeTabs.css";

export default function FolderTabs() {
  return (
    <nav className="folder-tabs-floating">
      <a
        className="folder-tab"
        href="http://localhost:3000/firms"
        target="_self"
        rel="noopener noreferrer"
      >
        Firms
      </a>
      <a
        className="folder-tab"
        href="http://localhost:3000/bank"
        target="_self"
        rel="noopener noreferrer"
      >
        Bank
      </a>
    </nav>
  );
}
