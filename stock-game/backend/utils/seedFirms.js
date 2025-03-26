const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Firm = require('../models/Firm'); // Adjust path as needed

dotenv.config();

async function seedFirms() {
  await mongoose.connect(process.env.MONGO_URI);

  const firms = [
    { name: "Aegis Capital", balance: 500000, riskTolerance: 0.1, strategy: "momentum", ownedShares: new Map(), transactions: [] },
    { name: "Helios Partners", balance: 750000, riskTolerance: 0.07, strategy: "contrarian", ownedShares: new Map(), transactions: [] },
    { name: "Orion Investments", balance: 1000000, riskTolerance: 0.05, strategy: "growth", ownedShares: new Map(), transactions: [] },
    { name: "Nova Hedge", balance: 300000, riskTolerance: 0.15, strategy: "volatility", ownedShares: new Map(), transactions: [] }
  ];

  await Firm.deleteMany({});
  await Firm.insertMany(firms);

  console.log("✅ Firms seeded!");
  process.exit();
}

seedFirms();
