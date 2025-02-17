const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });  // 👈 Explicitly specify path

console.log("MONGO_URI:", process.env.MONGO_URI);  // Debugging line


const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Stock = require('../models/Stock');
const GlobalNews = require('../models/GlobalNews');
const SectorNews = require('../models/SectorNews');
const StockNews = require('../models/StockNews');

// 🌍 Global News Data
const globalNews = [
  {
    "description": "The International Monetary Fund downgrades its global growth forecast, citing geopolitical tensions and slower consumer demand.",
    "sentimentScore": -6
  },
  {
    "description": "A leading pharmaceutical company announces the successful development of a universal flu vaccine, creating optimism in health and biotech sectors.",
    "sentimentScore": 7
  },
  {
    "description": "Global semiconductor supply chain issues are resolved, boosting technology production and reducing delays.",
    "sentimentScore": 9
  },
  {
    "description": "Massive natural disaster disrupts transportation and trade across several continents, causing delays and economic strain.",
    "sentimentScore": -8
  },
  {
    "description": "Major breakthrough in battery technology promises to revolutionize renewable energy storage capabilities.",
    "sentimentScore": 10
  },
  {
    "description": "Tensions rise as multiple countries impose export restrictions on rare earth metals, critical for advanced manufacturing.",
    "sentimentScore": -5
  },
  {
    "description": "A global treaty on tax reform is ratified, reducing tax avoidance by multinational corporations.",
    "sentimentScore": 4
  },
  {
    "description": "A global pandemic resurfaces with a more virulent strain, leading to lockdowns and widespread economic disruptions.",
    "sentimentScore": -10
  },
  {
    "description": "The United Nations reports a record decline in poverty levels globally, signaling improved living standards.",
    "sentimentScore": 6
  },
  {
    "description": "Breakdown of key international peace negotiations sparks concerns about regional stability.",
    "sentimentScore": -7
  },
  {
    "description": "A record-breaking technology IPO ignites interest in the stock market, drawing in new investors worldwide.",
    "sentimentScore": 5
  },
  {
    "description": "An unexpected ban on cryptocurrency mining in a major country disrupts global crypto markets.",
    "sentimentScore": -4
  },
  {
    "description": "Widespread adoption of quantum computing accelerates innovation across various sectors.",
    "sentimentScore": 8
  },
  {
    "description": "A coordinated effort to regulate artificial intelligence leads to tighter restrictions on AI development.",
    "sentimentScore": -3
  },
  {
    "description": "Global military spending reaches an all-time high, sparking concerns about future conflicts.",
    "sentimentScore": -6
  },
  {
    "description": "A major breakthrough in cancer treatment significantly boosts health sector confidence.",
    "sentimentScore": 9
  },
  {
    "description": "An unexpected rise in global commodity prices increases costs for businesses and consumers alike.",
    "sentimentScore": -5
  },
  {
    "description": "Key global markets agree on a new digital trade pact, reducing barriers and improving cross-border transactions.",
    "sentimentScore": 7
  },
  {
    "description": "Reports of widespread corporate accounting fraud in a major economy shakes investor confidence worldwide.",
    "sentimentScore": -8
  },
  {
    "description": "An international peace agreement is signed, leading to reduced military tensions in previously volatile regions.",
    "sentimentScore": 6
  },
  {
    "description": "Extreme weather patterns result in record agricultural losses, raising food prices globally.",
    "sentimentScore": -7
  },
  {
    "description": "The global adoption of 5G technology accelerates, leading to increased productivity and innovation in telecommunications.",
    "sentimentScore": 8
  },
  {
    "description": "A major country defaults on its sovereign debt, sending shockwaves through global financial markets.",
    "sentimentScore": -9
  },
  {
    "description": "Renewed diplomatic relations between major economies boost international trade prospects.",
    "sentimentScore": 5
  },
  {
    "description": "A leading tech company is hit with a significant antitrust lawsuit, raising concerns about regulatory impacts.",
    "sentimentScore": -4
  },
  {
    "description": "Global carbon emissions reach a historic low due to advancements in clean energy adoption.",
    "sentimentScore": 7
  },
  {
    "description": "Mass protests erupt worldwide against rising inequality, leading to disruptions in several major cities.",
    "sentimentScore": -6
  },
  {
    "description": "A new international space exploration mission generates optimism in advanced technology sectors.",
    "sentimentScore": 6
  },
  {
    "description": "Reports of a looming global recession send markets into a sharp decline as investors seek safer assets.",
    "sentimentScore": -10
  },
  {
    "description": "A surge in global venture capital funding drives innovation in startups across various industries.",
    "sentimentScore": 5
  }
]

// 🏢 Sector News Data
const sectorNews = {
  "sectors": {
    "energy": [
      { "description": "Oil prices surge due to OPEC's decision to cut production.", "sentimentScore": 7 },
      { "description": "Renewable energy sector sees significant investments after government incentives.", "sentimentScore": 8 },
      { "description": "Natural gas exports increase as demand rises in Europe.", "sentimentScore": 6 },
      { "description": "Large oil spill damages company reputation and incurs cleanup costs.", "sentimentScore": -8 },
      { "description": "Breakthrough in hydrogen fuel technology boosts investor confidence.", "sentimentScore": 9 },
      { "description": "Energy prices drop as global supply chains stabilize.", "sentimentScore": 5 },
      { "description": "Nuclear energy projects face delays due to regulatory hurdles.", "sentimentScore": -4 }
    ],
    "materials": [
      { "description": "New mining regulations increase costs for raw material extraction.", "sentimentScore": -5 },
      { "description": "Discovery of a new mineral deposit boosts future prospects for mining companies.", "sentimentScore": 6 },
      { "description": "Innovative recycling technologies reduce production costs.", "sentimentScore": 7 },
      { "description": "Trade sanctions limit the export of critical materials.", "sentimentScore": -6 },
      { "description": "Increased demand for construction materials due to urban development projects.", "sentimentScore": 6 },
      { "description": "Price hike in rare earth metals benefits mining companies.", "sentimentScore": 8 },
      { "description": "Worker strike disrupts operations in a major mining region.", "sentimentScore": -7 }
    ],
    "industrials": [
      { "description": "Major airline companies report record holiday bookings.", "sentimentScore": 8 },
      { "description": "Expansion in automation technology improves manufacturing efficiency.", "sentimentScore": 7 },
      { "description": "Defense contracts awarded for cutting-edge equipment production.", "sentimentScore": 9 },
      { "description": "Industrial machinery exports face tariffs in key markets.", "sentimentScore": -5 },
      { "description": "Logistics companies report record volumes during the holiday season.", "sentimentScore": 6 },
      { "description": "Launch of eco-friendly construction equipment captures market share.", "sentimentScore": 8 },
      { "description": "Aviation sector sees rising fuel costs impacting profit margins.", "sentimentScore": -4 }
    ],
    "consumer_discretionary": [
      { "description": "Luxury goods sales in Asia see a sharp decline due to economic slowdown concerns.", "sentimentScore": -6 },
      { "description": "Increase in travel bookings boosts revenue for hospitality industries.", "sentimentScore": 6 },
      { "description": "E-commerce platforms report record sales during shopping festivals.", "sentimentScore": 8 },
      { "description": "Rising wages increase discretionary spending in the middle class.", "sentimentScore": 7 },
      { "description": "Video game industry sees growth with the launch of new consoles.", "sentimentScore": 8 },
      { "description": "Auto manufacturers face recalls due to safety issues.", "sentimentScore": -7 },
      { "description": "Cultural festivals boost demand for themed merchandise.", "sentimentScore": 6 }
    ],
    "consumer_staples": [
      { "description": "Demand for essential goods rises amid fears of economic downturn.", "sentimentScore": 6 },
      { "description": "New line of eco-friendly products receives positive market reception.", "sentimentScore": 7 },
      { "description": "Rising costs of agricultural inputs impact margins.", "sentimentScore": -5 },
      { "description": "Retailers see strong demand for packaged foods during the holiday season.", "sentimentScore": 8 },
      { "description": "Beverage companies innovate with new functional drink offerings.", "sentimentScore": 7 },
      { "description": "Shortage of raw materials disrupts supply chains for staples.", "sentimentScore": -6 },
      { "description": "Introduction of subscription-based grocery delivery services gains traction.", "sentimentScore": 8 }
    ],
    "health_care": [
      { "description": "Breakthrough cancer treatment receives FDA approval.", "sentimentScore": 9 },
      { "description": "Major pharmaceutical company announces positive results from vaccine trials.", "sentimentScore": 8 },
      { "description": "Rising demand for telemedicine platforms during flu season.", "sentimentScore": 7 },
      { "description": "Healthcare provider faces lawsuits over patient data breaches.", "sentimentScore": -6 },
      { "description": "Research collaboration accelerates development of Alzheimer’s drug.", "sentimentScore": 8 },
      { "description": "New regulations on drug pricing put pressure on pharmaceutical companies.", "sentimentScore": -5 },
      { "description": "Increased funding for hospital infrastructure projects drives growth.", "sentimentScore": 6 }
    ],
    "financials": [
      { "description": "Federal Reserve signals a pause in interest rate hikes.", "sentimentScore": 5 },
      { "description": "Strong quarterly earnings reported by leading investment firms.", "sentimentScore": 7 },
      { "description": "Credit card companies see record transaction volumes during holiday sales.", "sentimentScore": 8 },
      { "description": "Regulatory changes enhance transparency in financial markets.", "sentimentScore": 6 },
      { "description": "Mortgage rates hit new lows, spurring home purchases.", "sentimentScore": 7 },
      { "description": "Global banking institutions face penalties for non-compliance.", "sentimentScore": -6 },
      { "description": "Wealth management services expand offerings to younger demographics.", "sentimentScore": 6 }
    ],
    "information_technology": [
      { "description": "Tech giant announces cutting-edge AI chip, set to dominate the market.", "sentimentScore": 10 },
      { "description": "Innovative blockchain platform gains traction among enterprise clients.", "sentimentScore": 9 },
      { "description": "Software company launches an all-in-one productivity suite.", "sentimentScore": 8 },
      { "description": "Cybersecurity breach affects key players in the IT sector.", "sentimentScore": -7 },
      { "description": "Expansion of data center capabilities drives revenue growth.", "sentimentScore": 7 },
      { "description": "Introduction of advanced AR/VR technologies revolutionizes user experience.", "sentimentScore": 9 },
      { "description": "Shortage of semiconductor chips disrupts production timelines.", "sentimentScore": -6 }
    ],
    "communication_services": [
      { "description": "Streaming platform faces backlash over price hikes, leading to subscriber loss.", "sentimentScore": -4 },
      { "description": "Telecom company launches 5G services nationwide, increasing customer base.", "sentimentScore": 8 },
      { "description": "Social media platform introduces new features, boosting engagement.", "sentimentScore": 7 },
      { "description": "Regulatory scrutiny on misinformation impacts major platforms.", "sentimentScore": -5 },
      { "description": "Partnerships with content creators drive growth for digital streaming services.", "sentimentScore": 8 },
      { "description": "Rise in advertising revenue benefits leading media companies.", "sentimentScore": 7 },
      { "description": "Television network struggles with declining viewer ratings.", "sentimentScore": -6 }
    ],
    "utilities": [
      { "description": "Government subsidies boost renewable energy projects.", "sentimentScore": 7 },
      { "description": "Severe weather increases demand for utility services, improving revenues.", "sentimentScore": 6 },
      { "description": "Expansion of solar power installations drives growth in clean energy.", "sentimentScore": 8 },
      { "description": "Aging infrastructure leads to higher maintenance costs for utility companies.", "sentimentScore": -5 },
      { "description": "Introduction of smart grids enhances energy efficiency.", "sentimentScore": 7 },
      { "description": "Utility companies face lawsuits over wildfire liabilities.", "sentimentScore": -7 },
      { "description": "Increased focus on wind energy boosts sector innovation.", "sentimentScore": 8 }
    ],
    "real_estate": [
      { "description": "Housing market cools as mortgage rates hit multi-decade highs.", "sentimentScore": -3 },
      { "description": "Urban redevelopment projects attract new investors to the sector.", "sentimentScore": 6 },
      { "description": "Demand for commercial real estate rises with post-pandemic recovery.", "sentimentScore": 7 },
      { "description": "Rising construction costs delay key housing projects.", "sentimentScore": -6 },
      { "description": "Introduction of co-living spaces gains popularity among young professionals.", "sentimentScore": 8 },
      { "description": "Real estate investment trusts report higher dividends this quarter.", "sentimentScore": 7 },
      { "description": "Government policies supporting affordable housing improve market outlook.", "sentimentScore": 6 }
    ]
  }
}


// 📈 Stock-Specific News Data
const stockNews = {
  "sectors": {
    "information_technology": [
        { "ticker": "NOVA", "description": "Launch of an AI-powered software suite for enterprise solutions.", "sentimentScore": 8 },
        { "ticker": "NOVA", "description": "Delays in software deployment lead to customer dissatisfaction.", "sentimentScore": -6 },
        { "ticker": "NOVA", "description": "Acquisition of a competitor expands market share.", "sentimentScore": 7 },
        { "ticker": "NOVA", "description": "Legal dispute over patent infringements raises concerns.", "sentimentScore": -5 },
        { "ticker": "NOVA", "description": "Strong demand for next-gen enterprise tools drives revenue.", "sentimentScore": 8 },
        { "ticker": "NOVA", "description": "System outages impact a significant number of enterprise clients.", "sentimentScore": -6 },
        { "ticker": "GLMT", "description": "Launch of a next-gen AI tool that automates complex workflows.", "sentimentScore": 8 },
        { "ticker": "GLMT", "description": "AI-powered search engine unveiled, challenging industry leaders.", "sentimentScore": 9 },
        { "ticker": "GLMT", "description": "Strategic partnerships with tech leaders enhance AI deployment.", "sentimentScore": 7 },
        { "ticker": "GLMT", "description": "Criticism over lack of transparency in AI algorithms surfaces.", "sentimentScore": -5 },
        { "ticker": "BYTE", "description": "Acquisition of a company specializing in blockchain technology.", "sentimentScore": 7 },
        { "ticker": "BYTE", "description": "CEO announces strategic shift towards software-as-a-service.", "sentimentScore": 5 },
        { "ticker": "BYTE", "description": "Patent approval for blockchain scalability increases market confidence.", "sentimentScore": 8 },
        { "ticker": "BYTE", "description": "Disruption in software services leads to customer backlash.", "sentimentScore": -6 },
        { "ticker": "CYBR", "description": "Discovery of a security flaw in its flagship cybersecurity platform.", "sentimentScore": -6 },
        { "ticker": "CYBR", "description": "Major government contract awarded for cybersecurity solutions.", "sentimentScore": 7 },
        { "ticker": "CYBR", "description": "Introduction of zero-trust frameworks gains traction.", "sentimentScore": 8 },
        { "ticker": "CYBR", "description": "Missed earnings expectations due to delayed rollouts.", "sentimentScore": -5 },
        { "ticker": "NETX", "description": "Major software vulnerability discovered, requiring an urgent patch.", "sentimentScore": -7 },
        { "ticker": "NETX", "description": "Expansion into Southeast Asia markets brings growth opportunities.", "sentimentScore": 6 },
        { "ticker": "NETX", "description": "Successful launch of a cloud platform upgrade boosts adoption.", "sentimentScore": 8 },
        { "ticker": "NETX", "description": "Customer complaints about platform reliability increase.", "sentimentScore": -5 },
        { "ticker": "AURA", "description": "Collaboration with global leaders to develop quantum computing technologies.", "sentimentScore": 9 },
        { "ticker": "AURA", "description": "Unexpected delay in hardware delivery impacts revenue.", "sentimentScore": -4 },
        { "ticker": "AURA", "description": "Launch of quantum-ready cloud services attracts key clients.", "sentimentScore": 8 },
        { "ticker": "AURA", "description": "Concerns over cost overruns in development projects emerge.", "sentimentScore": -6 },
        { "ticker": "CODE", "description": "Introduction of a revolutionary new chip architecture.", "sentimentScore": 9 },
        { "ticker": "CODE", "description": "Record-breaking pre-orders for new hardware drive revenue.", "sentimentScore": 8 },
        { "ticker": "CODE", "description": "Software compatibility issues with new architecture arise.", "sentimentScore": -6 },
        { "ticker": "CORE", "description": "Patent awarded for a next-generation cloud infrastructure system.", "sentimentScore": 8 },
        { "ticker": "CORE", "description": "Failure to meet cloud security benchmarks affects market confidence.", "sentimentScore": -6 },
        { "ticker": "CORE", "description": "Successful integration of AI into data management systems attracts investment.", "sentimentScore": 8 },
        { "ticker": "CORE", "description": "Criticism over high pricing models for enterprise solutions arises.", "sentimentScore": -5 }
    ],
    "healthcare": [
        { "ticker": "HMTL", "description": "Breakthrough in cancer treatment sees global acclaim.", "sentimentScore": 9 },
        { "ticker": "HMTL", "description": "Clinical trials for a new drug show promising results.", "sentimentScore": 8 },
        { "ticker": "HMTL", "description": "Reports of unexpected side effects raise safety concerns.", "sentimentScore": -6 },
        { "ticker": "HMTL", "description": "FDA delays approval for new treatment, causing uncertainty.", "sentimentScore": -5 },
        { "ticker": "MEDX", "description": "Acquisition of a biotech startup enhances innovation pipeline.", "sentimentScore": 7 },
        { "ticker": "MEDX", "description": "High-profile lawsuit over drug pricing sparks controversy.", "sentimentScore": -6 },
        { "ticker": "MEDX", "description": "Record-breaking revenue driven by demand for vaccines.", "sentimentScore": 9 },
        { "ticker": "MEDX", "description": "Supply chain disruptions lead to missed delivery targets.", "sentimentScore": -5 },
        { "ticker": "BIOM", "description": "Successful launch of a revolutionary diagnostic tool.", "sentimentScore": 8 },
        { "ticker": "BIOM", "description": "Data breach exposes patient information, damaging trust.", "sentimentScore": -7 },
        { "ticker": "BIOM", "description": "Partnership with a global tech company accelerates innovation.", "sentimentScore": 7 },
        { "ticker": "BIOM", "description": "Concerns over high R&D expenses affect investor confidence.", "sentimentScore": -4 },
        { "ticker": "XRAY", "description": "New imaging technology sets a benchmark in precision diagnostics.", "sentimentScore": 9 },
        { "ticker": "XRAY", "description": "Unexpected decline in demand for diagnostic services.", "sentimentScore": -5 },
        { "ticker": "XRAY", "description": "Expansion into emerging markets boosts growth prospects.", "sentimentScore": 8 },
        { "ticker": "XRAY", "description": "Patent expiration invites competition from generic manufacturers.", "sentimentScore": -6 },
        { "ticker": "GENX", "description": "Groundbreaking gene therapy gains regulatory approval.", "sentimentScore": 10 },
        { "ticker": "GENX", "description": "Technical hurdles in gene therapy manufacturing slow progress.", "sentimentScore": -6 },
        { "ticker": "GENX", "description": "Strategic collaboration with academic institutions accelerates innovation.", "sentimentScore": 7 },
        { "ticker": "GENX", "description": "Reports of adverse reactions in clinical trials cause concern.", "sentimentScore": -5 },
        { "ticker": "ZENO", "description": "Launch of a wearable device for continuous health monitoring.", "sentimentScore": 8 },
        { "ticker": "ZENO", "description": "Criticism over data privacy policies sparks backlash.", "sentimentScore": -6 },
        { "ticker": "ZENO", "description": "Recognition as a leader in health tech innovation boosts reputation.", "sentimentScore": 9 },
        { "ticker": "ZENO", "description": "Missed revenue targets lead to reduced investor confidence.", "sentimentScore": -5 },
        { "ticker": "PRME", "description": "Introduction of an affordable treatment for a widespread condition.", "sentimentScore": 9 },
        { "ticker": "PRME", "description": "Clinical trial failure for a flagship drug impacts outlook.", "sentimentScore": -6 },
        { "ticker": "PRME", "description": "Adoption of AI in drug discovery enhances efficiency.", "sentimentScore": 8 },
        { "ticker": "PRME", "description": "Controversy over ethical issues in clinical testing emerges.", "sentimentScore": -5 },
        { "ticker": "ALTN", "description": "Development of a personalized medicine platform attracts investors.", "sentimentScore": 9 },
        { "ticker": "ALTN", "description": "Delays in product launch due to manufacturing challenges.", "sentimentScore": -4 },
        { "ticker": "ALTN", "description": "Positive results from a long-term clinical study inspire confidence.", "sentimentScore": 8 },
        { "ticker": "ALTN", "description": "Litigation over patent disputes creates financial uncertainty.", "sentimentScore": -6 },
        { "ticker": "HARM", "description": "Launch of a revolutionary treatment for chronic diseases.", "sentimentScore": 9 },
        { "ticker": "HARM", "description": "Government regulations increase compliance costs.", "sentimentScore": -5 },
        { "ticker": "HARM", "description": "Successful trial for a new vaccine sparks optimism.", "sentimentScore": 8 },
        { "ticker": "HARM", "description": "Supply shortages hinder production of key medications.", "sentimentScore": -6 },
        { "ticker": "CLAR", "description": "Investment in mental health initiatives garners public support.", "sentimentScore": 8 },
        { "ticker": "CLAR", "description": "Data manipulation accusations result in reputational damage.", "sentimentScore": -7 },
        { "ticker": "CLAR", "description": "Approval of a rare disease drug opens new market opportunities.", "sentimentScore": 9 },
        { "ticker": "CLAR", "description": "Rising competition in its primary market affects revenue.", "sentimentScore": -5 },
        { "ticker": "ORCA", "description": "Breakthrough in organ regeneration technology.", "sentimentScore": 10 },
        { "ticker": "ORCA", "description": "Operational mismanagement leads to production delays.", "sentimentScore": -5 },
        { "ticker": "ORCA", "description": "Strong demand for regenerative medicine drives stock surge.", "sentimentScore": 9 },
        { "ticker": "ORCA", "description": "Ethical concerns over use of technology spark debate.", "sentimentScore": -6 },
        { "ticker": "GENE", "description": "Success in a global vaccination program boosts reputation.", "sentimentScore": 9 },
        { "ticker": "GENE", "description": "FDA rejection of a key drug application disappoints investors.", "sentimentScore": -7 },
        { "ticker": "GENE", "description": "Partnership with non-profits enhances outreach programs.", "sentimentScore": 8 },
        { "ticker": "GENE", "description": "Rising R&D costs impact profit margins.", "sentimentScore": -5 }
    ],
  "industrials": [
    { "ticker": "ASTC", "description": "Launch of an advanced robotics line reduces operational costs.", "sentimentScore": 8 },
    { "ticker": "ASTC", "description": "Production delays in key facilities impact quarterly revenue.", "sentimentScore": -5 },
    { "ticker": "ASTC", "description": "Partnership with a global logistics company expands market reach.", "sentimentScore": 7 },
    { "ticker": "ASTC", "description": "Safety concerns in a manufacturing plant lead to a temporary shutdown.", "sentimentScore": -6 },
    { "ticker": "DRVN", "description": "Successful launch of electric vehicles for urban transit.", "sentimentScore": 9 },
    { "ticker": "DRVN", "description": "Increased competition in the electric vehicle market affects margins.", "sentimentScore": -4 },
    { "ticker": "DRVN", "description": "Secures major government contract for infrastructure development.", "sentimentScore": 8 },
    { "ticker": "DRVN", "description": "Litigation over environmental violations sparks backlash.", "sentimentScore": -6 },
    { "ticker": "SPHR", "description": "Introduction of eco-friendly packaging systems garners praise.", "sentimentScore": 8 },
    { "ticker": "SPHR", "description": "Rising costs of raw materials impact profitability.", "sentimentScore": -5 },
    { "ticker": "SPHR", "description": "Investment in renewable energy projects boosts long-term growth outlook.", "sentimentScore": 7 },
    { "ticker": "SPHR", "description": "Workplace disputes disrupt production schedules.", "sentimentScore": -6 },
    { "ticker": "SKYH", "description": "Launch of innovative aerospace technology attracts military contracts.", "sentimentScore": 9 },
    { "ticker": "SKYH", "description": "Concerns over missed deadlines for government projects arise.", "sentimentScore": -5 },
    { "ticker": "SKYH", "description": "Acquisition of a rival company consolidates market position.", "sentimentScore": 7 },
    { "ticker": "SKYH", "description": "Delays in new product development create market uncertainty.", "sentimentScore": -6 },
    { "ticker": "CLIM", "description": "Successful bid for a large-scale construction project drives stock up.", "sentimentScore": 8 },
    { "ticker": "CLIM", "description": "Reports of quality issues in construction materials surface.", "sentimentScore": -5 },
    { "ticker": "CLIM", "description": "Recognition for leadership in sustainable building practices.", "sentimentScore": 9 },
    { "ticker": "CLIM", "description": "Increased labor costs impact operating margins.", "sentimentScore": -4 },
    { "ticker": "AERO", "description": "Successful satellite deployment boosts reputation.", "sentimentScore": 10 },
    { "ticker": "AERO", "description": "Technical malfunction during a launch raises safety concerns.", "sentimentScore": -7 },
    { "ticker": "AERO", "description": "Government investment in aerospace development enhances opportunities.", "sentimentScore": 8 },
    { "ticker": "AERO", "description": "Rising competition in commercial aviation impacts growth projections.", "sentimentScore": -5 },
    { "ticker": "PULS", "description": "Introduction of AI in supply chain management improves efficiency.", "sentimentScore": 8 },
    { "ticker": "PULS", "description": "Reports of cybersecurity breaches create vulnerabilities.", "sentimentScore": -6 },
    { "ticker": "PULS", "description": "Partnership with renewable energy firms reduces costs.", "sentimentScore": 7 },
    { "ticker": "PULS", "description": "Delays in infrastructure projects raise concerns.", "sentimentScore": -5 },
    { "ticker": "INVO", "description": "Launch of advanced automation technology reduces production times.", "sentimentScore": 9 },
    { "ticker": "INVO", "description": "Disruptions in global supply chains affect production schedules.", "sentimentScore": -6 },
    { "ticker": "INVO", "description": "Recognition for innovation in industrial automation systems.", "sentimentScore": 8 },
    { "ticker": "INVO", "description": "Litigation over patent disputes creates financial uncertainty.", "sentimentScore": -5 },
    { "ticker": "XACT", "description": "Launch of a compact and efficient turbine attracts new customers.", "sentimentScore": 8 },
    { "ticker": "XACT", "description": "Weak demand in key markets impacts sales.", "sentimentScore": -5 },
    { "ticker": "XACT", "description": "R&D breakthrough improves energy efficiency in products.", "sentimentScore": 9 },
    { "ticker": "XACT", "description": "Rising tariffs on industrial components affect costs.", "sentimentScore": -6 },
    { "ticker": "FUME", "description": "Expansion into emerging markets drives revenue growth.", "sentimentScore": 8 },
    { "ticker": "FUME", "description": "Environmental concerns over emissions lead to regulatory scrutiny.", "sentimentScore": -7 },
    { "ticker": "FUME", "description": "Launch of eco-friendly manufacturing processes improves reputation.", "sentimentScore": 9 },
    { "ticker": "FUME", "description": "Supply chain bottlenecks slow product deliveries.", "sentimentScore": -5 },
    { "ticker": "SPIN", "description": "Successful debut of a high-performance industrial engine.", "sentimentScore": 9 },
    { "ticker": "SPIN", "description": "Rising competition from international players affects market share.", "sentimentScore": -4 },
    { "ticker": "SPIN", "description": "Increased investment in R&D boosts innovation pipeline.", "sentimentScore": 8 },
    { "ticker": "SPIN", "description": "Economic downturn leads to weaker demand for industrial products.", "sentimentScore": -5 },
    { "ticker": "ECHO", "description": "Introduction of drone delivery services opens new markets.", "sentimentScore": 8 },
    { "ticker": "ECHO", "description": "Technical issues with new equipment delay projects.", "sentimentScore": -6 },
    { "ticker": "ECHO", "description": "Recognition for excellence in logistics innovation.", "sentimentScore": 9 },
    { "ticker": "ECHO", "description": "Concerns over reliance on outdated technology surface.", "sentimentScore": -5 },
    { "ticker": "ZENI", "description": "Launch of sustainable transport solutions garners praise.", "sentimentScore": 8 },
    { "ticker": "ZENI", "description": "Operational issues in factories lead to delays.", "sentimentScore": -5 },
    { "ticker": "ZENI", "description": "Expansion of electric vehicle manufacturing increases capacity.", "sentimentScore": 9 },
    { "ticker": "ZENI", "description": "Rising production costs impact profit margins.", "sentimentScore": -4 },
    { "ticker": "FLUX", "description": "Debut of energy-efficient systems sees strong demand.", "sentimentScore": 9 },
    { "ticker": "FLUX", "description": "Labor shortages delay production timelines.", "sentimentScore": -6 },
    { "ticker": "FLUX", "description": "Collaboration with renewable energy companies boosts credibility.", "sentimentScore": 8 },
    { "ticker": "FLUX", "description": "Reports of defective products create customer dissatisfaction.", "sentimentScore": -5 }
  ],
  "energy": [
    { "ticker": "GRBX", "description": "Discovery of a major oil reserve increases long-term prospects.", "sentimentScore": 9 },
    { "ticker": "GRBX", "description": "Environmental protests against drilling projects cause delays.", "sentimentScore": -6 },
    { "ticker": "GRBX", "description": "Introduction of cost-effective extraction methods boosts efficiency.", "sentimentScore": 7 },
    { "ticker": "GRBX", "description": "Rising geopolitical tensions impact supply chains.", "sentimentScore": -5 },
    { "ticker": "SUNR", "description": "Expansion into solar power plants boosts green energy portfolio.", "sentimentScore": 8 },
    { "ticker": "SUNR", "description": "Government subsidies for renewable energy enhance profitability.", "sentimentScore": 7 },
    { "ticker": "SUNR", "description": "Technical advancements improve solar panel efficiency.", "sentimentScore": 9 },
    { "ticker": "SUNR", "description": "Criticism over land acquisition policies sparks backlash.", "sentimentScore": -5 },
    { "ticker": "HYDN", "description": "Rising fuel prices increase revenue but hurt consumer confidence.", "sentimentScore": 5 },
    { "ticker": "HYDN", "description": "Reports of a major oil spill lead to fines and reputation damage.", "sentimentScore": -7 },
    { "ticker": "HYDN", "description": "Successful negotiations secure a long-term export deal.", "sentimentScore": 8 },
    { "ticker": "HYDN", "description": "Regulatory hurdles delay approval for new drilling projects.", "sentimentScore": -6 },
    { "ticker": "WIND", "description": "Launch of offshore wind farms sets a new industry standard.", "sentimentScore": 8 },
    { "ticker": "WIND", "description": "Delays in wind turbine shipments due to supply chain issues.", "sentimentScore": -5 },
    { "ticker": "WIND", "description": "Major investment in wind power infrastructure attracts investors.", "sentimentScore": 7 },
    { "ticker": "WIND", "description": "Rising material costs reduce profit margins.", "sentimentScore": -4 },
    { "ticker": "DINO", "description": "Strategic acquisition of a refinery boosts production capacity.", "sentimentScore": 7 },
    { "ticker": "DINO", "description": "Rising operational costs reduce profit margins.", "sentimentScore": -4 },
    { "ticker": "DINO", "description": "Introduction of advanced refining technologies improves yield.", "sentimentScore": 8 },
    { "ticker": "DINO", "description": "Opposition from local communities disrupts operations.", "sentimentScore": -6 },
    { "ticker": "BLZE", "description": "Breakthrough in biofuel technology enhances sustainability goals.", "sentimentScore": 8 },
    { "ticker": "BLZE", "description": "Reports of faulty equipment lead to temporary shutdowns.", "sentimentScore": -6 },
    { "ticker": "BLZE", "description": "New government incentives for biofuel production increase profitability.", "sentimentScore": 9 },
    { "ticker": "BLZE", "description": "Concerns over feedstock shortages affect output.", "sentimentScore": -5 },
    { "ticker": "FRNT", "description": "Increased demand for natural gas drives revenue growth.", "sentimentScore": 9 },
    { "ticker": "FRNT", "description": "Disputes over land rights stall key pipeline projects.", "sentimentScore": -5 },
    { "ticker": "FRNT", "description": "Technological improvements reduce transportation costs.", "sentimentScore": 8 },
    { "ticker": "FRNT", "description": "Rising competition from renewables impacts market share.", "sentimentScore": -4 },
    { "ticker": "SOLR", "description": "Innovative solar panel design receives industry-wide recognition.", "sentimentScore": 9 },
    { "ticker": "SOLR", "description": "Reports of declining efficiency in older solar farms raise concerns.", "sentimentScore": -4 },
    { "ticker": "SOLR", "description": "Expansion into international markets boosts growth.", "sentimentScore": 8 },
    { "ticker": "SOLR", "description": "Delays in securing raw materials impact production schedules.", "sentimentScore": -5 },
    { "ticker": "GASP", "description": "Approval for a new drilling site in a high-yield area boosts stocks.", "sentimentScore": 8 },
    { "ticker": "GASP", "description": "Litigation over environmental damages creates uncertainties.", "sentimentScore": -6 },
    { "ticker": "GASP", "description": "Introduction of automated systems reduces operating costs.", "sentimentScore": 7 },
    { "ticker": "GASP", "description": "Declining global demand for fossil fuels pressures revenue.", "sentimentScore": -5 },
    { "ticker": "LAVA", "description": "Strong quarterly earnings driven by increased demand for geothermal energy.", "sentimentScore": 8 },
    { "ticker": "LAVA", "description": "High capital expenditures for new projects worry investors.", "sentimentScore": -5 },
    { "ticker": "LAVA", "description": "Recognition for leadership in geothermal innovation boosts reputation.", "sentimentScore": 9 },
    { "ticker": "LAVA", "description": "Rising competition from solar energy providers affects growth.", "sentimentScore": -4 },
    { "ticker": "RADI", "description": "Successful launch of a nuclear energy project sets new benchmarks.", "sentimentScore": 9 },
    { "ticker": "RADI", "description": "Regulatory hurdles delay progress in key nuclear projects.", "sentimentScore": -6 },
    { "ticker": "RADI", "description": "Government funding for nuclear research supports growth.", "sentimentScore": 8 },
    { "ticker": "RADI", "description": "Public opposition to nuclear projects sparks controversy.", "sentimentScore": -5 },
    { "ticker": "KYTE", "description": "Innovative wind turbine design gains market traction.", "sentimentScore": 8 },
    { "ticker": "KYTE", "description": "Weak demand in international markets affects growth.", "sentimentScore": -5 },
    { "ticker": "KYTE", "description": "Successful pilot projects in offshore wind farms improve outlook.", "sentimentScore": 7 },
    { "ticker": "KYTE", "description": "Rising transportation costs hurt profitability.", "sentimentScore": -4 },
    { "ticker": "HEAT", "description": "Major investment in thermal energy technology boosts outlook.", "sentimentScore": 8 },
    { "ticker": "HEAT", "description": "Rising competition from alternative energy sources reduces market share.", "sentimentScore": -4 },
    { "ticker": "HEAT", "description": "Introduction of efficient heat storage systems enhances demand.", "sentimentScore": 9 },
    { "ticker": "HEAT", "description": "Delays in project rollouts due to supply chain issues.", "sentimentScore": -5 },
    { "ticker": "GIGA", "description": "Recognition as a leader in green energy innovation attracts investors.", "sentimentScore": 9 },
    { "ticker": "GIGA", "description": "Reports of delayed deliveries for critical projects create uncertainties.", "sentimentScore": -5 },
    { "ticker": "GIGA", "description": "Launch of a new energy-efficient turbine gains market traction.", "sentimentScore": 8 },
    { "ticker": "GIGA", "description": "Rising maintenance costs for older infrastructure impact margins.", "sentimentScore": -4 },
    { "ticker": "BOLT", "description": "Launch of energy storage solutions enhances renewable energy adoption.", "sentimentScore": 9 },
    { "ticker": "BOLT", "description": "Unexpected maintenance costs for infrastructure hurt profits.", "sentimentScore": -6 },
    { "ticker": "BOLT", "description": "Collaboration with battery manufacturers boosts production.", "sentimentScore": 8 },
    { "ticker": "BOLT", "description": "Concerns over scalability of new storage solutions emerge.", "sentimentScore": -5 }
  ], 
  "consumer_staples": [
    { "ticker": "CNTK", "description": "Launch of a new organic product line boosts brand recognition.", "sentimentScore": 8 },
    { "ticker": "CNTK", "description": "Rising raw material costs impact profit margins.", "sentimentScore": -5 },
    { "ticker": "CNTK", "description": "Partnership with major retailers expands distribution network.", "sentimentScore": 7 },
    { "ticker": "CNTK", "description": "Product recall due to safety concerns damages reputation.", "sentimentScore": -6 },
    { "ticker": "NATF", "description": "Strong demand for healthy snack alternatives drives sales.", "sentimentScore": 8 },
    { "ticker": "NATF", "description": "Disruption in supply chain delays product deliveries.", "sentimentScore": -5 },
    { "ticker": "NATF", "description": "Awarded certification for sustainable practices, attracting eco-conscious consumers.", "sentimentScore": 9 },
    { "ticker": "NATF", "description": "Reports of contamination in a product batch cause customer backlash.", "sentimentScore": -6 },
    { "ticker": "PURE", "description": "Expansion into emerging markets drives strong quarterly growth.", "sentimentScore": 9 },
    { "ticker": "PURE", "description": "Criticism over environmental impact of packaging affects brand image.", "sentimentScore": -5 },
    { "ticker": "PURE", "description": "Collaboration with a global food delivery app increases sales.", "sentimentScore": 7 },
    { "ticker": "PURE", "description": "Rising labor costs reduce overall profit margins.", "sentimentScore": -4 },
    { "ticker": "FLOP", "description": "Successful advertising campaign improves market share.", "sentimentScore": 8 },
    { "ticker": "FLOP", "description": "Negative reviews for a flagship product harm public perception.", "sentimentScore": -5 },
    { "ticker": "FLOP", "description": "Introduction of a loyalty program increases customer retention.", "sentimentScore": 7 },
    { "ticker": "FLOP", "description": "Regulatory issues regarding product labeling create uncertainty.", "sentimentScore": -4 },
    { "ticker": "ORGN", "description": "Launch of plant-based alternatives strengthens market presence.", "sentimentScore": 9 },
    { "ticker": "ORGN", "description": "Increased competition from low-cost rivals pressures pricing strategies.", "sentimentScore": -5 },
    { "ticker": "ORGN", "description": "Recognition for innovation in product development attracts investors.", "sentimentScore": 8 },
    { "ticker": "ORGN", "description": "Rising shipping costs reduce profit margins.", "sentimentScore": -4 },
    { "ticker": "LUNA", "description": "New partnerships with supermarkets boost sales growth.", "sentimentScore": 8 },
    { "ticker": "LUNA", "description": "Supply chain bottlenecks disrupt product availability.", "sentimentScore": -6 },
    { "ticker": "LUNA", "description": "Introduction of an eco-friendly packaging line gains praise.", "sentimentScore": 9 },
    { "ticker": "LUNA", "description": "Declining consumer spending affects revenue.", "sentimentScore": -5 },
    { "ticker": "GRNV", "description": "Launch of a premium product line generates excitement.", "sentimentScore": 9 },
    { "ticker": "GRNV", "description": "Negative publicity over labor practices harms brand reputation.", "sentimentScore": -6 },
    { "ticker": "GRNV", "description": "Strong earnings report beats market expectations.", "sentimentScore": 8 },
    { "ticker": "GRNV", "description": "Regulatory fines for non-compliance impact financials.", "sentimentScore": -5 },
    { "ticker": "SOLN", "description": "Breakthrough in preservation technology extends product shelf life.", "sentimentScore": 9 },
    { "ticker": "SOLN", "description": "Criticism over pricing strategy causes consumer backlash.", "sentimentScore": -6 },
    { "ticker": "SOLN", "description": "Expansion of online sales channels boosts growth.", "sentimentScore": 8 },
    { "ticker": "SOLN", "description": "Unexpected increase in logistics costs affects profit margins.", "sentimentScore": -5 },
    { "ticker": "POND", "description": "New flavor launch receives overwhelmingly positive reviews.", "sentimentScore": 9 },
    { "ticker": "POND", "description": "Operational inefficiencies reduce production capacity.", "sentimentScore": -5 },
    { "ticker": "POND", "description": "Awarded best-in-class for quality by industry experts.", "sentimentScore": 8 },
    { "ticker": "POND", "description": "Rising inflation pressures consumers to opt for cheaper alternatives.", "sentimentScore": -4 }
  ],
  "materials": [
    { "ticker": "VTRD", "description": "Introduction of sustainable mining practices improves brand reputation.", "sentimentScore": 8 },
    { "ticker": "VTRD", "description": "Rising costs of raw materials reduce profit margins.", "sentimentScore": -5 },
    { "ticker": "VTRD", "description": "Secures long-term contracts with major construction companies.", "sentimentScore": 7 },
    { "ticker": "VTRD", "description": "Reports of safety violations at mining sites surface.", "sentimentScore": -6 },
    { "ticker": "STEL", "description": "Expansion into international markets increases revenue.", "sentimentScore": 8 },
    { "ticker": "STEL", "description": "Oversupply in steel markets leads to declining prices.", "sentimentScore": -4 },
    { "ticker": "STEL", "description": "Technological innovations in production reduce costs.", "sentimentScore": 9 },
    { "ticker": "STEL", "description": "Criticism over environmental impact of operations affects image.", "sentimentScore": -6 },
    { "ticker": "GOLD", "description": "Discovery of a new gold reserve boosts long-term prospects.", "sentimentScore": 9 },
    { "ticker": "GOLD", "description": "Declining gold prices due to market saturation impact revenue.", "sentimentScore": -5 },
    { "ticker": "GOLD", "description": "Partnership with a luxury brand increases demand for precious metals.", "sentimentScore": 7 },
    { "ticker": "GOLD", "description": "Regulatory challenges in international markets slow growth.", "sentimentScore": -6 },
    { "ticker": "BRCK", "description": "Launch of eco-friendly building materials gains traction.", "sentimentScore": 8 },
    { "ticker": "BRCK", "description": "Rising competition in the construction industry reduces market share.", "sentimentScore": -5 },
    { "ticker": "BRCK", "description": "Adoption of AI in material logistics improves efficiency.", "sentimentScore": 9 },
    { "ticker": "BRCK", "description": "Reports of product defects impact reputation.", "sentimentScore": -6 },
    { "ticker": "COTN", "description": "Major government contract for infrastructure projects boosts revenue.", "sentimentScore": 8 },
    { "ticker": "COTN", "description": "Litigation over labor practices creates uncertainty.", "sentimentScore": -5 },
    { "ticker": "COTN", "description": "R&D breakthroughs in fiber technology gain industry recognition.", "sentimentScore": 9 },
    { "ticker": "COTN", "description": "Rising operational costs reduce net margins.", "sentimentScore": -4 },
    { "ticker": "PLAS", "description": "Development of biodegradable plastics attracts ESG investors.", "sentimentScore": 9 },
    { "ticker": "PLAS", "description": "Supply chain disruptions delay product deliveries.", "sentimentScore": -5 },
    { "ticker": "PLAS", "description": "Increased focus on recycling initiatives improves public image.", "sentimentScore": 8 },
    { "ticker": "PLAS", "description": "Criticism over high costs of new materials affects adoption rates.", "sentimentScore": -4 },
    { "ticker": "CRUX", "description": "Strong demand from the aerospace sector boosts quarterly sales.", "sentimentScore": 8 },
    { "ticker": "CRUX", "description": "Rising tariffs on raw materials create cost pressures.", "sentimentScore": -6 },
    { "ticker": "CRUX", "description": "Technological advancements reduce waste in production processes.", "sentimentScore": 7 },
    { "ticker": "CRUX", "description": "Labor disputes delay manufacturing schedules.", "sentimentScore": -5 },
    { "ticker": "MINR", "description": "Discovery of rare earth metals increases future revenue potential.", "sentimentScore": 9 },
    { "ticker": "MINR", "description": "Environmental protests disrupt mining operations.", "sentimentScore": -6 },
    { "ticker": "MINR", "description": "New agreements with electronics manufacturers secure long-term demand.", "sentimentScore": 8 },
    { "ticker": "MINR", "description": "Fines for regulatory violations reduce quarterly earnings.", "sentimentScore": -5 },
    { "ticker": "SHLD", "description": "Strong global demand for steel products improves revenue outlook.", "sentimentScore": 8 },
    { "ticker": "SHLD", "description": "Oversupply in domestic markets leads to price drops.", "sentimentScore": -4 },
    { "ticker": "SHLD", "description": "Investment in energy-efficient production methods reduces costs.", "sentimentScore": 7 },
    { "ticker": "SHLD", "description": "Rising costs of transportation impact profit margins.", "sentimentScore": -5 },
    { "ticker": "WELD", "description": "Record-high earnings driven by infrastructure development projects.", "sentimentScore": 9 },
    { "ticker": "WELD", "description": "Shortage of skilled labor delays project completions.", "sentimentScore": -5 },
    { "ticker": "WELD", "description": "Recognition as an industry leader in welding technology boosts reputation.", "sentimentScore": 8 },
    { "ticker": "WELD", "description": "Criticism over safety standards at production facilities arises.", "sentimentScore": -6 }
  ],
  "utilities": [
    { "ticker": "TRFX", "description": "Major investment in renewable energy projects boosts long-term growth.", "sentimentScore": 9 },
    { "ticker": "TRFX", "description": "Reports of power outages in key markets spark customer dissatisfaction.", "sentimentScore": -5 },
    { "ticker": "TRFX", "description": "Collaboration with local governments enhances grid modernization.", "sentimentScore": 8 },
    { "ticker": "TRFX", "description": "Rising fuel costs increase operational expenses.", "sentimentScore": -4 },
    { "ticker": "ECOG", "description": "Launch of eco-friendly energy solutions attracts ESG-focused investors.", "sentimentScore": 9 },
    { "ticker": "ECOG", "description": "Delays in infrastructure projects reduce growth outlook.", "sentimentScore": -5 },
    { "ticker": "ECOG", "description": "Successful implementation of AI in grid management improves efficiency.", "sentimentScore": 8 },
    { "ticker": "ECOG", "description": "Criticism over high utility rates impacts public image.", "sentimentScore": -6 },
    { "ticker": "WAVE", "description": "Record-breaking profits due to increased energy demand during heatwaves.", "sentimentScore": 8 },
    { "ticker": "WAVE", "description": "Technical failures in renewable energy systems reduce output.", "sentimentScore": -6 },
    { "ticker": "WAVE", "description": "Expansion into international markets boosts revenue.", "sentimentScore": 7 },
    { "ticker": "WAVE", "description": "Concerns over aging infrastructure spark safety worries.", "sentimentScore": -5 },
    { "ticker": "SYNR", "description": "Introduction of smart meters improves customer satisfaction.", "sentimentScore": 7 },
    { "ticker": "SYNR", "description": "Rising competition from independent energy providers impacts market share.", "sentimentScore": -5 },
    { "ticker": "SYNR", "description": "Recognition for leadership in clean energy initiatives enhances reputation.", "sentimentScore": 8 },
    { "ticker": "SYNR", "description": "Reports of delays in renewable energy adoption reduce investor confidence.", "sentimentScore": -4 },
    { "ticker": "LITE", "description": "Successful rollout of energy-saving technologies boosts growth.", "sentimentScore": 8 },
    { "ticker": "LITE", "description": "Criticism over environmental policies sparks protests.", "sentimentScore": -6 },
    { "ticker": "LITE", "description": "Partnership with tech firms accelerates renewable energy adoption.", "sentimentScore": 7 },
    { "ticker": "LITE", "description": "Rising costs of materials impact margins.", "sentimentScore": -5 },
    { "ticker": "AQUA", "description": "Launch of water desalination projects expands offerings.", "sentimentScore": 9 },
    { "ticker": "AQUA", "description": "Concerns over water scarcity issues increase demand for solutions.", "sentimentScore": 8 },
    { "ticker": "AQUA", "description": "Government regulations on water usage create challenges.", "sentimentScore": -5 },
    { "ticker": "AQUA", "description": "Increased R&D costs impact profitability.", "sentimentScore": -4 },
    { "ticker": "TYPH", "description": "Deployment of advanced storm-resistant infrastructure boosts reliability.", "sentimentScore": 8 },
    { "ticker": "TYPH", "description": "Weak demand in rural markets reduces revenue growth.", "sentimentScore": -5 },
    { "ticker": "TYPH", "description": "Investment in energy storage systems increases capacity.", "sentimentScore": 7 },
    { "ticker": "TYPH", "description": "Concerns over regulatory compliance create uncertainties.", "sentimentScore": -6 },
    { "ticker": "VOLT", "description": "Expansion into battery storage solutions attracts investors.", "sentimentScore": 8 },
    { "ticker": "VOLT", "description": "Reports of cybersecurity breaches in the grid management system.", "sentimentScore": -6 },
    { "ticker": "VOLT", "description": "Recognition as a leader in grid modernization projects boosts reputation.", "sentimentScore": 9 },
    { "ticker": "VOLT", "description": "Economic slowdown reduces industrial energy consumption.", "sentimentScore": -4 },
    { "ticker": "RAZE", "description": "Launch of sustainable energy programs garners industry praise.", "sentimentScore": 9 },
    { "ticker": "RAZE", "description": "Rising competition in urban areas impacts market share.", "sentimentScore": -5 },
    { "ticker": "RAZE", "description": "Government incentives for green energy adoption support growth.", "sentimentScore": 8 },
    { "ticker": "RAZE", "description": "Criticism over lack of transparency in energy pricing.", "sentimentScore": -6 },
    { "ticker": "FLIT", "description": "Launch of AI-powered energy distribution systems improves efficiency.", "sentimentScore": 8 },
    { "ticker": "FLIT", "description": "Reports of outdated infrastructure causing frequent outages.", "sentimentScore": -5 },
    { "ticker": "FLIT", "description": "Recognition for commitment to renewable energy adoption.", "sentimentScore": 7 },
    { "ticker": "FLIT", "description": "Increased maintenance costs reduce profit margins.", "sentimentScore": -4 }
  ],
  "communication_services": [
    { "ticker": "PXNL", "description": "Launch of an affordable mobile data plan attracts new subscribers.", "sentimentScore": 8 },
    { "ticker": "PXNL", "description": "Technical issues disrupt service for millions of users.", "sentimentScore": -6 },
    { "ticker": "PXNL", "description": "Partnership with a leading smartphone manufacturer boosts sales.", "sentimentScore": 7 },
    { "ticker": "PXNL", "description": "Concerns over data privacy policies spark backlash.", "sentimentScore": -5 },
    { "ticker": "VIDE", "description": "Introduction of a new streaming platform increases market share.", "sentimentScore": 9 },
    { "ticker": "VIDE", "description": "Licensing disputes with content creators impact availability.", "sentimentScore": -6 },
    { "ticker": "VIDE", "description": "Strong demand for exclusive content drives subscriber growth.", "sentimentScore": 8 },
    { "ticker": "VIDE", "description": "Rising competition from rivals reduces profitability.", "sentimentScore": -5 },
    { "ticker": "STREAM", "description": "Launch of a virtual reality-based streaming service gains traction.", "sentimentScore": 9 },
    { "ticker": "STREAM", "description": "Server outages during a major live event lead to customer dissatisfaction.", "sentimentScore": -7 },
    { "ticker": "STREAM", "description": "Expansion into emerging markets boosts user base.", "sentimentScore": 8 },
    { "ticker": "STREAM", "description": "Criticism over subscription price increases affects brand image.", "sentimentScore": -5 },
    { "ticker": "TALK", "description": "Introduction of an AI-powered customer service tool improves efficiency.", "sentimentScore": 8 },
    { "ticker": "TALK", "description": "Reports of layoffs spark employee protests.", "sentimentScore": -6 },
    { "ticker": "TALK", "description": "Recognition as a leader in enterprise communication solutions.", "sentimentScore": 7 },
    { "ticker": "TALK", "description": "Rising operational costs reduce quarterly profits.", "sentimentScore": -4 },
    { "ticker": "MOVI", "description": "Successful launch of a blockbuster movie boosts platform engagement.", "sentimentScore": 9 },
    { "ticker": "MOVI", "description": "Criticism over lack of diverse content sparks user backlash.", "sentimentScore": -6 },
    { "ticker": "MOVI", "description": "Partnership with international studios expands content library.", "sentimentScore": 8 },
    { "ticker": "MOVI", "description": "Rising production costs impact profit margins.", "sentimentScore": -5 },
    { "ticker": "ECHO", "description": "Introduction of an innovative podcast platform attracts creators.", "sentimentScore": 8 },
    { "ticker": "ECHO", "description": "Concerns over misinformation on the platform affect reputation.", "sentimentScore": -5 },
    { "ticker": "ECHO", "description": "Strong demand for localized content increases adoption rates.", "sentimentScore": 7 },
    { "ticker": "ECHO", "description": "Technical glitches in the app reduce user satisfaction.", "sentimentScore": -4 },
    { "ticker": "BETA", "description": "Launch of a premium ad-free service attracts high-value users.", "sentimentScore": 9 },
    { "ticker": "BETA", "description": "Regulatory fines for false advertising practices impact finances.", "sentimentScore": -6 },
    { "ticker": "BETA", "description": "Strong quarterly earnings driven by advertising revenue.", "sentimentScore": 8 },
    { "ticker": "BETA", "description": "Rising backlash over intrusive ads harms reputation.", "sentimentScore": -5 },
    { "ticker": "RUSH", "description": "Launch of a video-on-demand platform increases user engagement.", "sentimentScore": 8 },
    { "ticker": "RUSH", "description": "Reports of copyright infringement lawsuits create uncertainty.", "sentimentScore": -6 },
    { "ticker": "RUSH", "description": "Partnership with global sports leagues expands live streaming options.", "sentimentScore": 9 },
    { "ticker": "RUSH", "description": "Rising costs of content licensing reduce profitability.", "sentimentScore": -5 },
    { "ticker": "LOOP", "description": "Introduction of a next-gen messaging app attracts younger audiences.", "sentimentScore": 8 },
    { "ticker": "LOOP", "description": "Server outages during a promotional event reduce trust.", "sentimentScore": -5 },
    { "ticker": "LOOP", "description": "Recognition for its focus on user privacy strengthens image.", "sentimentScore": 9 },
    { "ticker": "LOOP", "description": "Concerns over data collection practices spark backlash.", "sentimentScore": -6 },
    { "ticker": "SAND", "description": "Launch of an educational content platform attracts schools.", "sentimentScore": 8 },
    { "ticker": "SAND", "description": "Reports of app crashes frustrate users.", "sentimentScore": -5 },
    { "ticker": "SAND", "description": "Collaboration with global education leaders boosts adoption.", "sentimentScore": 9 },
    { "ticker": "SAND", "description": "Criticism over subscription fees limits growth potential.", "sentimentScore": -4 }
  ],
  "consumer_discretionary": [
    { "ticker": "AETH", "description": "Launch of a new luxury electric vehicle line boosts demand.", "sentimentScore": 9 },
    { "ticker": "AETH", "description": "Supply chain disruptions delay key product launches.", "sentimentScore": -6 },
    { "ticker": "AETH", "description": "Partnership with tech firms enhances in-car connectivity features.", "sentimentScore": 8 },
    { "ticker": "AETH", "description": "Rising material costs reduce profit margins.", "sentimentScore": -5 },
    { "ticker": "LUXY", "description": "Introduction of a new high-end fashion collection drives revenue.", "sentimentScore": 9 },
    { "ticker": "LUXY", "description": "Criticism over lack of diversity in marketing campaigns sparks backlash.", "sentimentScore": -6 },
    { "ticker": "LUXY", "description": "Recognition as a leader in sustainable fashion enhances reputation.", "sentimentScore": 8 },
    { "ticker": "LUXY", "description": "Rising competition from fast fashion brands impacts growth.", "sentimentScore": -5 },
    { "ticker": "FANC", "description": "Record-breaking sales during the holiday season boost revenue.", "sentimentScore": 9 },
    { "ticker": "FANC", "description": "Reports of unethical labor practices create public relations issues.", "sentimentScore": -7 },
    { "ticker": "FANC", "description": "Launch of an exclusive loyalty program increases customer retention.", "sentimentScore": 8 },
    { "ticker": "FANC", "description": "Weak demand in key international markets affects earnings.", "sentimentScore": -5 },
    { "ticker": "EXQT", "description": "Introduction of a premium home appliance line gains market traction.", "sentimentScore": 9 },
    { "ticker": "EXQT", "description": "Delays in product certification disrupt rollout schedules.", "sentimentScore": -5 },
    { "ticker": "EXQT", "description": "Strong demand for smart home products drives revenue growth.", "sentimentScore": 8 },
    { "ticker": "EXQT", "description": "Rising costs of distribution reduce profit margins.", "sentimentScore": -4 },
    { "ticker": "FEVR", "description": "Launch of a viral marketing campaign increases brand awareness.", "sentimentScore": 8 },
    { "ticker": "FEVR", "description": "Criticism over misleading advertising practices reduces trust.", "sentimentScore": -6 },
    { "ticker": "FEVR", "description": "Partnership with influencers drives product adoption among younger consumers.", "sentimentScore": 9 },
    { "ticker": "FEVR", "description": "Economic slowdown leads to weaker sales of luxury products.", "sentimentScore": -5 },
    { "ticker": "SNAP", "description": "Successful launch of a new gaming console exceeds expectations.", "sentimentScore": 9 },
    { "ticker": "SNAP", "description": "Concerns over safety issues with gaming accessories surface.", "sentimentScore": -6 },
    { "ticker": "SNAP", "description": "Expansion into cloud gaming services boosts subscriber growth.", "sentimentScore": 8 },
    { "ticker": "SNAP", "description": "Rising costs of R&D create financial strain.", "sentimentScore": -5 },
    { "ticker": "ARCH", "description": "Introduction of sustainable furniture lines attracts eco-conscious consumers.", "sentimentScore": 8 },
    { "ticker": "ARCH", "description": "Rising transportation costs reduce overall profitability.", "sentimentScore": -5 },
    { "ticker": "ARCH", "description": "Recognition for innovation in design boosts market position.", "sentimentScore": 9 },
    { "ticker": "ARCH", "description": "Supply chain disruptions delay product deliveries.", "sentimentScore": -6 },
    { "ticker": "RISE", "description": "Successful entry into emerging markets drives revenue growth.", "sentimentScore": 8 },
    { "ticker": "RISE", "description": "Criticism over high prices impacts customer satisfaction.", "sentimentScore": -5 },
    { "ticker": "RISE", "description": "Launch of a budget-friendly product line attracts new customers.", "sentimentScore": 9 },
    { "ticker": "RISE", "description": "Reports of manufacturing defects harm brand reputation.", "sentimentScore": -6 },
    { "ticker": "NEON", "description": "Launch of a popular wearable tech accessory boosts sales.", "sentimentScore": 9 },
    { "ticker": "NEON", "description": "Reports of software glitches in devices frustrate users.", "sentimentScore": -5 },
    { "ticker": "NEON", "description": "Collaboration with fitness influencers drives product adoption.", "sentimentScore": 8 },
    { "ticker": "NEON", "description": "Economic headwinds slow growth in discretionary spending.", "sentimentScore": -4 },
    { "ticker": "DRGN", "description": "Introduction of an eco-friendly travel service gains traction.", "sentimentScore": 8 },
    { "ticker": "DRGN", "description": "Rising operational costs reduce profitability.", "sentimentScore": -5 },
    { "ticker": "DRGN", "description": "Strong demand for premium travel packages boosts revenue.", "sentimentScore": 9 },
    { "ticker": "DRGN", "description": "Criticism over pricing strategies limits customer growth.", "sentimentScore": -4 }
  ],
  "real_estate": [
    { "ticker": "STOR", "description": "Acquisition of commercial properties in urban areas boosts revenue.", "sentimentScore": 9 },
    { "ticker": "STOR", "description": "Rising interest rates reduce demand for retail space.", "sentimentScore": -6 },
    { "ticker": "STOR", "description": "Launch of a high-profile mixed-use development project garners attention.", "sentimentScore": 8 },
    { "ticker": "STOR", "description": "Delays in project approvals lead to increased costs.", "sentimentScore": -5 },
    { "ticker": "CRWN", "description": "Expansion into high-demand residential markets drives growth.", "sentimentScore": 8 },
    { "ticker": "CRWN", "description": "Criticism over poor maintenance of rental properties affects reputation.", "sentimentScore": -5 },
    { "ticker": "CRWN", "description": "Recognition for sustainable building designs enhances market position.", "sentimentScore": 9 },
    { "ticker": "CRWN", "description": "Rising material costs reduce construction margins.", "sentimentScore": -4 },
    { "ticker": "ZONE", "description": "Successful leasing of a major office space increases revenue.", "sentimentScore": 8 },
    { "ticker": "ZONE", "description": "Weak demand for commercial spaces in suburban areas impacts growth.", "sentimentScore": -5 },
    { "ticker": "ZONE", "description": "Introduction of smart building technology attracts premium tenants.", "sentimentScore": 9 },
    { "ticker": "ZONE", "description": "Economic downturn slows demand for new leases.", "sentimentScore": -6 },
    { "ticker": "CUBE", "description": "Launch of luxury apartment complexes drives rental income.", "sentimentScore": 9 },
    { "ticker": "CUBE", "description": "Criticism over lack of affordable housing initiatives sparks backlash.", "sentimentScore": -5 },
    { "ticker": "CUBE", "description": "Collaboration with architects to develop innovative designs gains attention.", "sentimentScore": 8 },
    { "ticker": "CUBE", "description": "Rising vacancies in key markets reduce profitability.", "sentimentScore": -6 },
    { "ticker": "QUAK", "description": "Launch of a real estate investment trust attracts institutional investors.", "sentimentScore": 8 },
    { "ticker": "QUAK", "description": "Legal disputes over land acquisition create uncertainties.", "sentimentScore": -6 },
    { "ticker": "QUAK", "description": "Recognition for excellence in urban development enhances image.", "sentimentScore": 9 },
    { "ticker": "QUAK", "description": "Rising costs of land acquisition impact profit margins.", "sentimentScore": -5 },
    { "ticker": "NOVA", "description": "Successful redevelopment of old properties into modern spaces boosts revenue.", "sentimentScore": 9 },
    { "ticker": "NOVA", "description": "Reports of delays in construction projects reduce investor confidence.", "sentimentScore": -5 },
    { "ticker": "NOVA", "description": "Strong demand for housing in suburban areas drives growth.", "sentimentScore": 8 },
    { "ticker": "NOVA", "description": "Criticism over zoning law violations affects image.", "sentimentScore": -6 },
    { "ticker": "BLOC", "description": "Introduction of co-working spaces gains popularity among startups.", "sentimentScore": 8 },
    { "ticker": "BLOC", "description": "Criticism over high rental prices sparks tenant dissatisfaction.", "sentimentScore": -5 },
    { "ticker": "BLOC", "description": "Partnership with tech firms to develop smart office spaces attracts tenants.", "sentimentScore": 9 },
    { "ticker": "BLOC", "description": "Economic slowdown reduces demand for commercial properties.", "sentimentScore": -6 }
  ]


  }
}


// 🏛 Stock Data
const stocks = [
    { ticker: 'ASTC', price: 153.42, change: 2.45, sector: 'Industrials', eps: 8.29, outstandingShares: 50_000_000 },
    { ticker: 'GRBX', price: 27.85, change: -0.32, sector: 'Energy', eps: 1.95, outstandingShares: 120_000_000 },
    { ticker: 'HMTL', price: 345.68, change: 1.12, sector: 'Health Care', eps: 15.23, outstandingShares: 25_000_000 },
    { ticker: 'FNXY', price: 92.30, change: -1.67, sector: 'Financials', eps: 7.16, outstandingShares: 75_000_000 },
    { ticker: 'CNTK', price: 18.45, change: 0.56, sector: 'Consumer Staples', eps: 0.97, outstandingShares: 200_000_000 },
    { ticker: 'GLMT', price: 57.19, change: 1.03, sector: 'Information Technology', eps: 2.25, outstandingShares: 150_000_000 },
    { ticker: 'VTRD', price: 42.76, change: -0.78, sector: 'Materials', eps: 2.71, outstandingShares: 85_000_000 },
    { ticker: 'TRFX', price: 66.21, change: 2.34, sector: 'Utilities', eps: 5.66, outstandingShares: 90_000_000 },
    { ticker: 'PXNL', price: 15.97, change: -0.12, sector: 'Communication Services', eps: 1.63, outstandingShares: 300_000_000 },
    { ticker: 'AETH', price: 210.43, change: 3.67, sector: 'Consumer Discretionary', eps: 7.71, outstandingShares: 40_000_000 },
    { ticker: 'DRVN', price: 84.56, change: -0.23, sector: 'Industrials', eps: 5.12, outstandingShares: 100_000_000 },
    { ticker: 'SUNR', price: 32.12, change: 1.89, sector: 'Energy', eps: 1.60, outstandingShares: 220_000_000 },
    { ticker: 'MEDX', price: 452.23, change: 2.11, sector: 'Health Care', eps: 15.23, outstandingShares: 18_000_000 },
    { ticker: 'CAPF', price: 110.50, change: -1.45, sector: 'Financials', eps: 10.52, outstandingShares: 60_000_000 },
    { ticker: 'NATF', price: 24.78, change: 0.45, sector: 'Consumer Staples', eps: 1.82, outstandingShares: 190_000_000 },
    { ticker: 'CODE', price: 82.34, change: 3.21, sector: 'Information Technology', eps: 2.85, outstandingShares: 130_000_000 },
    { ticker: 'STEL', price: 47.89, change: -0.56, sector: 'Materials', eps: 3.15, outstandingShares: 95_000_000 },
    { ticker: 'ECOG', price: 54.90, change: 1.87, sector: 'Utilities', eps: 4.46, outstandingShares: 140_000_000 },
    { ticker: 'VIDE', price: 21.45, change: 0.67, sector: 'Communication Services', eps: 1.22, outstandingShares: 280_000_000 },
    { ticker: 'LUXY', price: 315.67, change: 2.45, sector: 'Consumer Discretionary', eps: 13.49, outstandingShares: 30_000_000 },
    { ticker: 'LOGI', price: 67.12, change: 0.98, sector: 'Information Technology', eps: 2.51, outstandingShares: 120_000_000 },
    { ticker: 'SPHR', price: 135.45, change: 1.45, sector: 'Industrials', eps: 6.51, outstandingShares: 80_000_000 },
    { ticker: 'HYDN', price: 39.24, change: -1.12, sector: 'Energy', eps: 3.44, outstandingShares: 190_000_000 },
    { ticker: 'BIOM', price: 268.78, change: 3.45, sector: 'Health Care', eps: 10.93, outstandingShares: 22_000_000 },
    { ticker: 'WLTN', price: 98.45, change: -2.13, sector: 'Financials', eps: 9.94, outstandingShares: 50_000_000 },
    { ticker: 'PURE', price: 56.12, change: 0.32, sector: 'Consumer Staples', eps: 3.07, outstandingShares: 180_000_000 },
    { ticker: 'TECH', price: 145.76, change: 2.67, sector: 'Information Technology', eps: 4.86, outstandingShares: 95_000_000 },
    { ticker: 'GOLD', price: 65.43, change: -0.89, sector: 'Materials', eps: 4.85, outstandingShares: 70_000_000 },
    { ticker: 'STREAM', price: 34.12, change: 0.78, sector: 'Communication Services', eps: 2.08, outstandingShares: 250_000_000 },
    { ticker: 'FANC', price: 403.21, change: 2.89, sector: 'Consumer Discretionary', eps: 14.15, outstandingShares: 15_000_000 },
    { ticker: 'SKYH', price: 122.78, change: 3.45, sector: 'Industrials', eps: 8.35, outstandingShares: 65_000_000 },
    { ticker: 'WIND', price: 48.34, change: -0.56, sector: 'Energy', eps: 2.52, outstandingShares: 230_000_000 },
    { ticker: 'GENX', price: 372.23, change: 1.98, sector: 'Health Care', eps: 17.01, outstandingShares: 12_000_000 },
    { ticker: 'FINT', price: 140.67, change: -1.34, sector: 'Financials', eps: 12.45, outstandingShares: 55_000_000 },
    { ticker: 'ORGN', price: 62.34, change: 0.21, sector: 'Consumer Staples', eps: 3.50, outstandingShares: 170_000_000 },
    { ticker: 'NETX', price: 178.90, change: 3.12, sector: 'Information Technology', eps: 6.78, outstandingShares: 75_000_000 },
    { ticker: 'BRCK', price: 49.12, change: -1.67, sector: 'Materials', eps: 3.17, outstandingShares: 85_000_000 },
    { ticker: 'AQUA', price: 72.45, change: 2.34, sector: 'Utilities', eps: 5.53, outstandingShares: 110_000_000 },
    { ticker: 'TALK', price: 41.23, change: 1.23, sector: 'Communication Services', eps: 3.25, outstandingShares: 240_000_000 },
    { ticker: 'BYTE', price: 210.45, change: 2.45, sector: 'Information Technology', eps: 7.16, outstandingShares: 30_000_000 },
    { ticker: 'COTN', price: 48.67, change: -1.45, sector: 'Materials', eps: 3.18, outstandingShares: 100_000_000 },
    { ticker: 'LITE', price: 29.45, change: 0.34, sector: 'Utilities', eps: 2.78, outstandingShares: 220_000_000 },
    { ticker: 'MOVI', price: 64.34, change: -0.89, sector: 'Communication Services', eps: 3.81, outstandingShares: 210_000_000 },
    { ticker: 'FEVR', price: 341.12, change: 3.67, sector: 'Consumer Discretionary', eps: 12.54, outstandingShares: 20_000_000 },
    { ticker: 'BLZE', price: 45.67, change: -0.76, sector: 'Energy', eps: 3.09, outstandingShares: 160_000_000 },
    { ticker: 'PRME', price: 78.23, change: 0.98, sector: 'Health Care', eps: 3.78, outstandingShares: 140_000_000 },
    { ticker: 'GRND', price: 98.34, change: -1.45, sector: 'Materials', eps: 6.00, outstandingShares: 55_000_000 },
    { ticker: 'SNAP', price: 143.89, change: 3.56, sector: 'Consumer Discretionary', eps: 5.92, outstandingShares: 45_000_000 },
    { ticker: 'TYPH', price: 67.34, change: -0.34, sector: 'Utilities', eps: 6.18, outstandingShares: 130_000_000 },
    { ticker: 'FLUX', price: 89.12, change: 1.76, sector: 'Industrials', eps: 6.15, outstandingShares: 100_000_000 },
    { ticker: 'STOR', price: 156.78, change: -2.45, sector: 'Real Estate', eps: 8.61, outstandingShares: 50_000_000 },
    { ticker: 'CREE', price: 45.12, change: 0.89, sector: 'Consumer Staples', eps: 3.61, outstandingShares: 160_000_000 },
    { ticker: 'AURA', price: 312.45, change: 1.45, sector: 'Information Technology', eps: 11.61, outstandingShares: 22_000_000 },
    { ticker: 'QUAD', price: 52.89, change: -1.34, sector: 'Financials', eps: 5.18, outstandingShares: 80_000_000 },
    { ticker: 'ZENO', price: 89.67, change: 2.34, sector: 'Health Care', eps: 4.19, outstandingShares: 100_000_000 },
    { ticker: 'PRSM', price: 67.34, change: 0.76, sector: 'Materials', eps: 4.24, outstandingShares: 85_000_000 },
    { ticker: 'BETA', price: 145.67, change: -0.67, sector: 'Communication Services', eps: 6.14, outstandingShares: 125_000_000 },
    { ticker: 'CYBR', price: 210.34, change: 3.12, sector: 'Information Technology', eps: 7.43, outstandingShares: 25_000_000 },
    { ticker: 'FRNT', price: 56.78, change: 0.45, sector: 'Energy', eps: 4.18, outstandingShares: 190_000_000 },
    { ticker: 'GALA', price: 78.45, change: -1.23, sector: 'Utilities', eps: 6.64, outstandingShares: 150_000_000 },
    { ticker: 'NEON', price: 23.67, change: 1.89, sector: 'Consumer Discretionary', eps: 1.37, outstandingShares: 310_000_000 },
    { ticker: 'CLIM', price: 98.45, change: 2.45, sector: 'Industrials', eps: 6.93, outstandingShares: 65_000_000 },
    { ticker: 'SPRK', price: 120.45, change: -1.89, sector: 'Materials', eps: 6.21, outstandingShares: 70_000_000 },
    { ticker: 'ORCA', price: 67.12, change: 0.98, sector: 'Health Care', eps: 3.34, outstandingShares: 90_000_000 },
    { ticker: 'AERO', price: 143.56, change: 2.78, sector: 'Industrials', eps: 6.27, outstandingShares: 55_000_000 },
    { ticker: 'FINN', price: 98.67, change: -0.76, sector: 'Financials', eps: 10.17, outstandingShares: 45_000_000 },
    { ticker: 'VOLT', price: 34.56, change: 1.34, sector: 'Utilities', eps: 3.06, outstandingShares: 200_000_000 },
    { ticker: 'CORE', price: 210.78, change: 3.89, sector: 'Information Technology', eps: 7.22, outstandingShares: 25_000_000 },
    { ticker: 'SOLR', price: 76.89, change: 1.56, sector: 'Energy', eps: 3.77, outstandingShares: 110_000_000 },
    { ticker: 'DRGN', price: 145.34, change: -2.34, sector: 'Consumer Discretionary', eps: 5.65, outstandingShares: 35_000_000 },
    { ticker: 'CRWN', price: 56.78, change: 0.98, sector: 'Real Estate', eps: 3.81, outstandingShares: 130_000_000 },
    { ticker: 'PULS', price: 123.45, change: -1.45, sector: 'Industrials', eps: 8.95, outstandingShares: 50_000_000 },
    { ticker: 'LUNA', price: 87.34, change: 2.76, sector: 'Consumer Staples', eps: 4.83, outstandingShares: 140_000_000 },
    { ticker: 'RUSH', price: 45.67, change: 1.89, sector: 'Communication Services', eps: 3.68, outstandingShares: 260_000_000 },
    { ticker: 'HIVE', price: 178.45, change: -0.98, sector: 'Health Care', eps: 7.56, outstandingShares: 20_000_000 },
    { ticker: 'BLNK', price: 64.78, change: 2.34, sector: 'Information Technology', eps: 2.50, outstandingShares: 160_000_000 },
    { ticker: 'CRUX', price: 45.23, change: 0.76, sector: 'Materials', eps: 2.90, outstandingShares: 110_000_000 },
    { ticker: 'WAVE', price: 89.34, change: -1.45, sector: 'Utilities', eps: 8.27, outstandingShares: 120_000_000 },
    { ticker: 'ARCH', price: 134.78, change: 2.12, sector: 'Consumer Discretionary', eps: 5.44, outstandingShares: 40_000_000 },
    { ticker: 'ZENI', price: 78.12, change: -0.34, sector: 'Industrials', eps: 5.83, outstandingShares: 90_000_000 },
    { ticker: 'GLXY', price: 56.45, change: 1.45, sector: 'Energy', eps: 4.38, outstandingShares: 180_000_000 },
    { ticker: 'BOND', price: 67.89, change: 0.67, sector: 'Financials', eps: 7.14, outstandingShares: 70_000_000 },
    { ticker: 'ALTN', price: 98.23, change: 1.89, sector: "Health Care", eps: 4.53, outstandingShares: 150000000 },
    { ticker: 'FOXD', price: 123.45, change: -1.67, sector: "Communication Services", eps: 7.35, outstandingShares: 250000000 },
    { ticker: 'JUMP', price: 89.67, change: 2.34, sector: "Consumer Discretionary", eps: 3.96, outstandingShares: 100000000 },
    { ticker: 'QUAK', price: 56.23, change: 0.76, sector: "Real Estate", eps: 3.93, outstandingShares: 80000000 },
    { ticker: 'FLASH', price: 78.89, change: -0.98, sector: "Information Technology", eps: 2.97, outstandingShares: 200000000 },
    { ticker: 'FUME', price: 145.34, change: 2.45, sector: "Industrials", eps: 7.34, outstandingShares: 50000000 },
    { ticker: 'RADI', price: 210.56, change: 3.12, sector: "Energy", eps: 6.67, outstandingShares: 40000000 },
    { ticker: 'GLOO', price: 89.45, change: 1.78, sector: "Materials", eps: 6.11, outstandingShares: 100000000 },
    { ticker: 'ORBT', price: 102.34, change: 2.12, sector: "Information Technology", eps: 6.35, outstandingShares: 150000000 },
    { ticker: 'GASP', price: 38.56, change: -0.98, sector: "Energy", eps: 3.11, outstandingShares: 180000000 },
    { ticker: 'HARM', price: 312.45, change: 1.78, sector: "Health Care", eps: 13.08, outstandingShares: 30000000 },
    { ticker: 'ZAPP', price: 27.67, change: 3.45, sector: "Communication Services", eps: 1.61, outstandingShares: 220000000 },
    { ticker: 'MINR', price: 67.89, change: -1.45, sector: "Materials", eps: 4.40, outstandingShares: 75000000 },
    { ticker: 'LUXR', price: 198.56, change: 2.98, sector: "Consumer Discretionary", eps: 8.19, outstandingShares: 40000000 },
    { ticker: 'ELEC', price: 54.34, change: 0.45, sector: "Utilities", eps: 4.73, outstandingShares: 100000000 },
    { ticker: 'XACT', price: 176.45, change: -2.34, sector: "Industrials", eps: 11.83, outstandingShares: 45000000 },
    { ticker: 'BLOC', price: 87.12, change: 1.76, sector: "Real Estate", eps: 6.36, outstandingShares: 85000000 },
    { ticker: 'GRNV', price: 123.45, change: 2.34, sector: "Consumer Staples", eps: 6.23, outstandingShares: 90000000 },
    { ticker: 'FIRM', price: 98.12, change: -0.98, sector: "Financials", eps: 7.32, outstandingShares: 110000000 },
    { ticker: 'KYTE', price: 56.78, change: 1.89, sector: "Energy", eps: 4.30, outstandingShares: 160000000 },
    { ticker: 'PLAS', price: 87.34, change: 0.56, sector: "Materials", eps: 6.02, outstandingShares: 120000000 },
    { ticker: 'INVO', price: 143.23, change: -1.12, sector: "Industrials", eps: 6.76, outstandingShares: 70000000 },
    { ticker: 'RAZE', price: 67.45, change: 2.76, sector: "Utilities", eps: 5.87, outstandingShares: 95000000 },
    { ticker: 'BEAC', price: 212.34, change: 3.56, sector: "Information Technology", eps: 7.64, outstandingShares: 50000000 },
    { ticker: 'GENE', price: 78.23, change: 0.98, sector: "Health Care", eps: 3.74, outstandingShares: 180000000 },
    { ticker: 'SAND', price: 45.34, change: -0.78, sector: "Communication Services", eps: 3.02, outstandingShares: 220000000 },
    { ticker: 'WELD', price: 123.89, change: 1.45, sector: "Materials", eps: 6.77, outstandingShares: 95000000 },
    { ticker: 'RISE', price: 89.67, change: 2.45, sector: "Consumer Discretionary", eps: 4.01, outstandingShares: 80000000 },
    { ticker: 'CRED', price: 67.34, change: -1.23, sector: "Financials", eps: 6.88, outstandingShares: 110000000 },
    { ticker: 'FLIT', price: 54.78, change: 0.76, sector: "Utilities", eps: 4.28, outstandingShares: 130000000 },
    { ticker: 'LAVA', price: 98.45, change: 2.98, sector: "Energy", eps: 4.58, outstandingShares: 140000000 },
    { ticker: 'SPIN', price: 176.23, change: -1.67, sector: "Industrials", eps: 12.23, outstandingShares: 60000000 },
    { ticker: 'NOVA', price: 56.34, change: 1.56, sector: "Real Estate", eps: 3.35, outstandingShares: 85000000 },
    { ticker: 'SOLN', price: 123.78, change: 3.45, sector: "Consumer Staples", eps: 6.65, outstandingShares: 95000000 },
    { ticker: 'CLAR', price: 87.12, change: 0.98, sector: "Health Care", eps: 4.13, outstandingShares: 180000000 },
    { ticker: 'WATT', price: 67.45, change: -0.67, sector: "Information Technology", eps: 2.67, outstandingShares: 200000000 },
    { ticker: 'VEST', price: 54.67, change: 2.34, sector: "Financials", eps: 5.87, outstandingShares: 110000000 },
    { ticker: 'ALFA', price: 89.34, change: -1.12, sector: "Consumer Discretionary", eps: 7.78, outstandingShares: 70000000 },
    { ticker: 'HEAT', price: 176.45, change: 1.89, sector: "Energy", eps: 4.51, outstandingShares: 45000000 },
    { ticker: 'LOOP', price: 45.78, change: 2.56, sector: "Communication Services", eps: 3.02, outstandingShares: 220000000 },
    { ticker: 'ECHO', price: 143.12, change: -2.34, sector: "Industrials", eps: 6.78, outstandingShares: 80000000 },
    { ticker: 'SHLD', price: 67.89, change: 0.76, sector: "Materials", eps: 5.83, outstandingShares: 100000000 },
    { ticker: 'TORN', price: 212.34, change: 3.12, sector: "Information Technology", eps: 7.40, outstandingShares: 50000000 },
    { ticker: 'CUBE', price: 78.45, change: -0.98, sector: "Real Estate", eps: 5.80, outstandingShares: 90000000 },
    { ticker: 'CYCL', price: 54.89, change: 1.23, sector: "Utilities", eps: 5.08, outstandingShares: 110000000 },
    { ticker: 'GIGA', price: 98.34, change: 2.78, sector: "Energy", eps: 5.41, outstandingShares: 60000000 },
    { ticker: 'VORT', price: 123.45, change: -1.45, sector: "Health Care", eps: 7.62, outstandingShares: 45000000 },
    { ticker: 'POND', price: 67.34, change: 1.76, sector: "Consumer Staples", eps: 3.83, outstandingShares: 110000000 },
    { ticker: 'FUEL', price: 87.89, change: -2.34, sector: "Industrials", eps: 5.34, outstandingShares: 75000000 },
    { ticker: 'BOLT', price: 98.12, change: 0.45, sector: "Energy", eps: 4.21, outstandingShares: 160000000 },
    { ticker: 'LIFT', price: 123.78, change: -1.12, sector: "Communication Services", eps: 6.95, outstandingShares: 150000000 },
    { ticker: 'ELEV', price: 78.34, change: 2.89, sector: "Materials", eps: 4.89, outstandingShares: 90000000 },
    { ticker: 'GRIP', price: 54.45, change: -0.76, sector: "Financials", eps: 3.67, outstandingShares: 110000000 },
    { ticker: 'ZONE', price: 212.34, change: 3.56, sector: "Real Estate", eps: 6.93, outstandingShares: 50000000 },
    { ticker: 'CONE', price: 67.78, change: 1.12, sector: "Information Technology", eps: 6.97, outstandingShares: 140000000 }
];

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // 🌍 Clear previous data
        await Promise.all([
            Stock.deleteMany(),
            GlobalNews.deleteMany(),
            SectorNews.deleteMany(),
            StockNews.deleteMany(),
        ]);
        console.log("🗑 Cleared old data");

        // 📈 Insert Stock Data
        const updatedStocks = stocks.map(stock => ({
            ...stock,
            peRatio: parseFloat((stock.price / stock.eps).toFixed(2)), // Ensure numerical value
            dividendYield: parseFloat(((stock.eps * 0.4) / stock.price).toFixed(4)), // 40% payout ratio
            history: [stock.price], // Initialize price history
        }));
        await Stock.insertMany(updatedStocks);
        console.log(`✅ Inserted ${updatedStocks.length} stocks`);

        // 🌍 Insert Global News
        await GlobalNews.insertMany(globalNews);
        console.log(`✅ Inserted ${globalNews.length} global news articles`);

        // 🏢 Insert Sector News
        await SectorNews.insertMany([sectorNews]); // Ensure it follows schema structure
        console.log(`✅ Inserted sector news`);

        // 📈 Insert Stock-Specific News
        await StockNews.insertMany([stockNews]); // Ensure correct structure
        console.log(`✅ Inserted stock-specific news`);

        console.log("🎉 Database seeding complete");
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        mongoose.connection.close(); // Ensure the connection is always closed
    }
};

// 🚀 Run the seed function
seedDatabase();
