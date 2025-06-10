// src/components/FeaturedStocks.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/featuredStocks.css';

export default function FeaturedStocks() {
  const navigate = useNavigate();

  const cards = [
    {
      title: '🚀 Top Movers',
      subtitle: 'See biggest % movers',
      route: '/top-movers',
      color: '#4CAF50'
    },
    {
      title: '🎢 Most Volatile',
      subtitle: 'See most volatile stocks',
      route: '/top-volatility',
      color: '#FF9800'
    },
    {
      title: '🏦 Top Market Cap',
      subtitle: 'See largest companies',
      route: '/top-marketcap',
      color: '#2196F3'
    },
    {
      title: '💸 Top Dividend Yield',
      subtitle: 'See top dividend payers',
      route: '/top-dividends',
      color: '#9C27B0'
    }
  ];

  return (
    <div className="featured-dashboard">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="featured-card"
          style={{ backgroundColor: card.color }}
          onClick={() => navigate(card.route)}
        >
          <h2>{card.title}</h2>
          <p>{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
