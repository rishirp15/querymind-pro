// backend/server.js
// This is the main file that starts our server
 
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads variables from .env file
 
// Import our route files (we will create these next)
const dbRoutes = require('./routes/database');
const aiRoutes  = require('./routes/ai');
 
const app  = express();
const PORT = process.env.PORT || 3001;
 
// ── Middleware ──────────────────────────────────────────────────
// cors() allows our React frontend (port 5173) to call this server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
 
// express.json() lets us read JSON data sent in requests
app.use(express.json());
 
// ── Routes ──────────────────────────────────────────────────────
// All database routes start with /api/db
app.use('/api/db', dbRoutes);
// All AI routes start with /api/ai
app.use('/api/ai', aiRoutes);
 
// ── Health check ─────────────────────────────────────────────────
// Visit http://localhost:3001/api/health to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QueryMind server is running!' });
});
 
// ── Start server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`QueryMind server running at http://localhost:${PORT}`);
});
