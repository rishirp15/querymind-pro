<div align="center">

# 🧠 QueryMind Pro

### AI-Powered SQL Intelligence Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Convert plain English to SQL. Explore schemas. Visualize queries. Detect anomalies. All in one dark-themed dashboard.**

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Docs](#-api-reference)

---

![QueryMind Pro Screenshot](https://via.placeholder.com/900x500/0F172A/4F46E5?text=QueryMind+Pro+Dashboard)

</div>

---

## ✨ Features

### 🤖 AI-Powered
| Feature | Description |
|---|---|
| **NLP → SQL** | Type any question in plain English — get accurate SQL instantly |
| **AI Query Optimizer** | Send any slow query to AI, get a faster rewritten version with explanations |
| **AI Schema Designer** | Describe a database in English, get complete DDL with table definitions |
| **AI Chat** | Multi-turn conversation about your data with full context memory |
| **Anomaly Detection** | AI scans tables for NULLs, duplicates, outliers, broken foreign keys |

### 🛠️ Developer Tools
| Feature | Description |
|---|---|
| **Multi-Tab SQL Editor** | CodeMirror 6 editor with SQL syntax highlighting, Ctrl+Enter to run |
| **EXPLAIN Plan** | Real execution plan from the database rendered in a table |
| **Results Chart View** | Bar/line charts auto-generated from numeric query results |
| **CSV Export** | One-click download of any query result as a properly formatted CSV |
| **Query History** | Full log of every executed query with timing and row counts |
| **Favourites** | Star any query to pin it — persists for the session |

### 🗄️ Database Intelligence
| Feature | Description |
|---|---|
| **Schema Explorer** | Browse all tables and columns with cross-table search |
| **ER Diagram** | Interactive SVG diagram with real foreign key relationship lines |
| **Query Simulator** | 8-stage animated visualization of SQL execution internals |
| **Performance Dashboard** | Live charts: execution time trends, slowest queries, most-queried tables |

### 🔌 Multi-Database Support
- **MySQL** / MariaDB
- **PostgreSQL**
- **SQLite**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- A MySQL, PostgreSQL, or SQLite database
- Free Groq API key → [console.groq.com](https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/querymind-pro.git
cd querymind-pro
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

> Get your free Groq API key at [console.groq.com](https://console.groq.com) → API Keys → Create API Key

### 5. Run the app

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm start

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
querymind-pro/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── .env                   # API keys and config (never commit this)
│   ├── .gitignore
│   ├── package.json
│   ├── routes/
│   │   ├── ai.js              # /api/ai/* — Groq AI endpoints
│   │   └── database.js        # /api/db/* — Database operation endpoints
│   └── db/
│       └── connection.js      # MySQL / PostgreSQL / SQLite abstraction layer
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx            # Root component + tab routing
        ├── main.jsx           # React entry point
        ├── api.js             # All Axios API calls (centralized)
        ├── store.jsx          # Global state — React Context
        └── components/
            ├── ConnectTab.jsx      # Database connection
            ├── SchemaTab.jsx       # Schema browser + ER diagram
            ├── EditorTab.jsx       # Multi-tab SQL editor
            ├── NLPTab.jsx          # Natural language → SQL
            ├── SimulatorTab.jsx    # Query execution visualizer
            ├── DesignerTab.jsx     # AI schema designer
            ├── HistoryTab.jsx      # Query history + favourites
            ├── DashboardTab.jsx    # Performance analytics
            ├── ChatTab.jsx         # Conversational AI
            └── AnomalyTab.jsx      # Data anomaly detection
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Browser (React SPA)         │
│         localhost:5173              │
│   React 18 + Vite + CodeMirror 6   │
│         React Context API           │
└──────────────┬──────────────────────┘
               │  HTTP / JSON (Axios)
               ▼
┌─────────────────────────────────────┐
│      Express Server (Node.js)       │
│         localhost:3001              │
│   routes/ai.js   routes/database.js │
│      db/connection.js               │
└──────┬────────────────┬─────────────┘
       │                │
       ▼                ▼
┌────────────┐   ┌──────────────────┐
│  Groq API  │   │  Your Database   │
│ LLaMA 3.3  │   │ MySQL/PG/SQLite  │
│  70B (free)│   │                  │
└────────────┘   └──────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| State Management | React Context API |
| SQL Editor | CodeMirror 6 via @uiw/react-codemirror |
| Charts | Recharts |
| Backend | Node.js, Express |
| AI | Groq API — llama-3.3-70b-versatile |
| Database Drivers | mysql2, pg, better-sqlite3 |
| HTTP Client | Axios |
| Notifications | react-hot-toast |

---

## 📡 API Reference

### Database Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/db/connect` | `{ engine, host, port, database, user, password }` | Connect and load schema |
| POST | `/api/db/query` | `{ sql }` | Execute any SQL query |
| POST | `/api/db/explain` | `{ sql }` | Run EXPLAIN on a query |
| GET | `/api/db/stats` | — | Table sizes and row counts |
| POST | `/api/db/foreign-keys` | — | All FK relationships |

### AI Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/ai/nlp` | `{ question, dialect, schema, feedback }` | NLP → SQL |
| POST | `/api/ai/design` | `{ description, dialect, schema }` | Generate schema DDL |
| POST | `/api/ai/optimize` | `{ sql, dialect, schema }` | AI query optimization |
| POST | `/api/ai/chat` | `{ messages, dialect, schema }` | Multi-turn chat |
| POST | `/api/ai/anomaly` | `{ schema, sampleData, dialect }` | Detect data issues |

---

## 🗄️ Test Database Setup

Run this SQL to create a sample database for testing:

```sql
CREATE DATABASE querymind_test;
USE querymind_test;

CREATE TABLE customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255),
  email      VARCHAR(255),
  country    VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(255),
  category VARCHAR(100),
  price    DECIMAL(10,2),
  stock    INT DEFAULT 0
);

CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  total       DECIMAL(10,2),
  status      VARCHAR(50) DEFAULT 'pending',
  order_date  DATE DEFAULT (CURDATE()),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Sample data
INSERT INTO customers (name, email, country) VALUES
  ('Alice Johnson', 'alice@example.com', 'USA'),
  ('Bob Smith',     'bob@example.com',   'UK'),
  ('Priya Sharma',  'priya@example.com', 'India'),
  ('Carlos Ruiz',   'carlos@example.com','Mexico'),
  ('Emma Wilson',   'emma@example.com',  'Canada');

INSERT INTO products (name, category, price, stock) VALUES
  ('Laptop Pro',    'Electronics', 1299.99, 45),
  ('Wireless Mouse','Electronics',   29.99, 200),
  ('Standing Desk', 'Furniture',    499.99,  12),
  ('Notebook',      'Stationery',     4.99, 500),
  ('Headphones',    'Electronics',   79.99,  88);

INSERT INTO orders (customer_id, total, status, order_date) VALUES
  (1, 1329.98, 'completed', '2024-01-15'),
  (2,   29.99, 'completed', '2024-01-20'),
  (3,  579.98, 'pending',   '2024-02-01'),
  (1,   79.99, 'completed', '2024-02-10'),
  (4,  499.99, 'shipped',   '2024-02-14'),
  (5,   34.98, 'pending',   '2024-03-01'),
  (2,  129.99, 'completed', '2024-03-05');
```

Then connect with:
- **Engine:** MySQL
- **Host:** localhost
- **Port:** 3306
- **Database:** querymind_test
- **Username:** root

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key from console.groq.com |
| `PORT` | Optional | Backend port (default: 3001) |
| `FRONTEND_URL` | Optional | Frontend URL for CORS (default: http://localhost:5173) |

---

## 📦 All npm Packages

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "groq-sdk": "latest",
    "mysql2": "^3.6.5",
    "pg": "^8.11.3",
    "better-sqlite3": "^9.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.10.0",
    "@uiw/react-codemirror": "^4.21.0",
    "@codemirror/lang-sql": "^6.5.0",
    "@codemirror/theme-one-dark": "^6.1.2"
  }
}
```

---

## 🚢 Deployment

### Backend → Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the `backend` folder as root
4. Add environment variables: `GROQ_API_KEY`, `FRONTEND_URL`
5. Copy the generated Railway URL

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set root directory to `frontend`
3. Add env variable: `VITE_API_URL=https://your-backend.railway.app`
4. Deploy

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) for the blazing-fast free LLM API
- [Meta AI](https://ai.meta.com) for the LLaMA 3.3 70B model
- [CodeMirror](https://codemirror.net) for the excellent editor engine
- [Recharts](https://recharts.org) for the charting library

---

<div align="center">

⭐ Star this repo if you found it useful!

</div>
