// backend/routes/database.js
// These are the HTTP endpoints our frontend will call
 
const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
 
// ── POST /api/db/connect ─────────────────────────────────────────
// Frontend sends: { engine, host, port, user, password, database }
// We try to connect and return success or error
router.post('/connect', async (req, res) => {
  try {
    const result = await db.connect(req.body);
    res.json({ success: true, message: 'Connected successfully!', engine: result.engine });
  } catch (error) {
    // Send the error message back so the frontend can display it
    res.status(400).json({ success: false, error: error.message });
  }
});
 
// ── GET /api/db/schema ───────────────────────────────────────────
// Returns all tables and columns from the connected database
router.get('/schema', async (req, res) => {
  try {
    const schema = await db.getSchema();
    res.json({ success: true, schema });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
 
// ── POST /api/db/execute ─────────────────────────────────────────
// Frontend sends: { sql: "SELECT * FROM users" }
// We run the SQL and return results
router.post('/execute', async (req, res) => {
  const { sql } = req.body;
 
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, error: 'SQL cannot be empty' });
  }
 
  // Safety: warn about destructive operations (frontend handles confirmation)
  const dangerous = /^\s*(DELETE|DROP|TRUNCATE)/i.test(sql);
 
  try {
    const result = await db.query(sql);
    res.json({
      success:   true,
      rows:      result.rows,
      columns:   result.columns,
      rowCount:  result.rowCount,
      time:      result.time,
      dangerous,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
 
// ── GET /api/db/databases ───────────────────────────────────────
// Returns list of databases on the server (for the switcher)
router.get('/databases', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT datname as name FROM pg_database WHERE datistemplate = false ORDER BY datname"
    );
    res.json({ success: true, databases: result.rows.map(r => r.name) });
  } catch (error) {
    res.status(400).json({ success: false, databases: [] });
  }
});
 
module.exports = router;

// ── POST /api/db/explain ─────────────────────────────────────────
router.post('/explain', async (req, res) => {
  const { sql } = req.body;
  try {
    let result;
    // MySQL uses EXPLAIN, PostgreSQL uses EXPLAIN ANALYZE
    const explainSQL = `EXPLAIN ${sql}`;
    result = await db.query(explainSQL);
    res.json({ success: true, rows: result.rows, columns: result.columns });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/db/stats ────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    // Return basic DB stats — table sizes
    const result = await db.query(`
      SELECT
        table_name,
        table_rows,
        ROUND(data_length / 1024, 1) AS data_kb,
        ROUND(index_length / 1024, 1) AS index_kb
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_rows DESC
    `);
    res.json({ success: true, rows: result.rows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── POST /api/db/foreign-keys ────────────────────────────────────
router.post('/foreign-keys', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        TABLE_NAME        as from_table,
        COLUMN_NAME       as from_column,
        REFERENCED_TABLE_NAME  as to_table,
        REFERENCED_COLUMN_NAME as to_column,
        CONSTRAINT_NAME   as constraint_name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME
    `);
    res.json({ success: true, rows: result.rows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
