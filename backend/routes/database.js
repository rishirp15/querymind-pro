// backend/routes/database.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ── POST /api/db/connect ─────────────────────────────────────────
router.post('/connect', async (req, res) => {
  try {
    const { engine, host, port, user, password, database, filepath } = req.body;
    const result = await db.connect({ engine, host, port, user, password, database, filepath });
    res.json({ success: true, message: 'Connected successfully!', engine: result.engine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/db/schema ───────────────────────────────────────────
router.get('/schema', async (req, res) => {
  try {
    const schema = await db.getSchema();
    res.json({ success: true, schema });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── POST /api/db/execute ─────────────────────────────────────────
router.post('/execute', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, error: 'SQL cannot be empty' });
  }
  const dangerous = /^\s*(DELETE|DROP|TRUNCATE)/i.test(sql);
  try {
    const result = await db.query(sql);
    res.json({ success: true, rows: result.rows, columns: result.columns, rowCount: result.rowCount, time: result.time, dangerous });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/db/databases ────────────────────────────────────────
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

// ── POST /api/db/explain ─────────────────────────────────────────
router.post('/explain', async (req, res) => {
  const { sql } = req.body;
  try {
    const result = await db.query(`EXPLAIN ${sql}`);
    res.json({ success: true, rows: result.rows, columns: result.columns });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/db/stats ────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name, table_rows,
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
        TABLE_NAME             as from_table,
        COLUMN_NAME            as from_column,
        REFERENCED_TABLE_NAME  as to_table,
        REFERENCED_COLUMN_NAME as to_column,
        CONSTRAINT_NAME        as constraint_name
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

// ── module.exports must be LAST ──────────────────────────────────
module.exports = router;