// src/components/FolderTabs.jsx
import React from "react";
import "../styles/homeTabs.css";

export default function FolderTabs() {
  return (
    <nav className="folder-tabs-floating">
      <a
        className="folder-tab"
        href="/firms"
        target="_self"
        rel="noopener noreferrer"
      >
        Firms
      </a>
      <a
        className="folder-tab"
        href="/bank"
        target="_self"
        rel="noopener noreferrer"
      >
        Bank
      </a>
    </nav>
  );
}
