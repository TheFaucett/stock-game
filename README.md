# 📈 Stock Market Simulator Game

A full-stack stock market simulator where users can view sector-level and stock-level heatmaps, buy and sell shares, and monitor their portfolio — all powered by live-updating data and MongoDB persistence.

## 🔧 Tech Stack

- **Frontend:** React, React Router, Recharts, React Query
- **Backend:** Node.js, Express, MongoDB (with Mongoose)
- **Database:** MongoDB Atlas (remote cloud database)
- **Styling:** Custom CSS (dark theme)

---

## 🚀 Features

### ✅ Real-time Heatmap Visualizations
- **Sector-level heatmap** to show average sector performance
- **Drill-down to stock-level heatmap** for individual tickers
- Color coded using change % (green for gain, red for loss)

### ✅ Stock Detail Pages
- Dynamic route: `/stock/:ticker`
- Shows current price, EPS, market cap, price history graph
- Allows **buying and selling** shares

### ✅ Transactions & Portfolio
- User portfolio stored in MongoDB via `Portfolio` model
- All transactions recorded with timestamp, price, and share count
- Balances are synced between `User` and `Portfolio`

### ✅ News-Driven Market Changes
- Stocks are impacted by **global**, **sector**, and **stock-specific news**
- Gaussian noise adds realism to price changes

### ✅ Modular Architecture
- Separated into well-defined routes, controllers, and models
- Frontend components are reusable and minimalist
- API requests handled through `React Query` for auto-refreshing

---

## 🛠️ Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/stock-market-game.git
cd stock-market-game
