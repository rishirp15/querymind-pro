// backend/routes/database.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { getEngine } = db;

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
  const dangerous = /^\s*(DELETE|DROP|TRUNCATE|UPDATE)/i.test(sql);
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
    const engine = getEngine();
    let rows = [];
    if (engine === 'postgresql') {
      const r = await db.query("SELECT datname as name FROM pg_database WHERE datistemplate = false ORDER BY datname");
      rows = r.rows.map(r => r.name || r.datname);
    } else if (engine === 'mysql') {
      const r = await db.query("SHOW DATABASES");
      rows = r.rows.map(r => Object.values(r)[0]);
    } else {
      // SQLite: single file = single database
      rows = ['(SQLite - single file database)'];
    }
    res.json({ success: true, databases: rows });
  } catch (error) {
    res.status(400).json({ success: false, databases: [], error: error.message });
  }
});

// ── POST /api/db/explain ─────────────────────────────────────────
router.post('/explain', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, error: 'SQL cannot be empty' });
  }
  if (!/^\s*SELECT/i.test(sql.trim())) {
    return res.status(400).json({ success: false, error: 'EXPLAIN only supports SELECT queries' });
  }
  try {
    const result = await db.query(`EXPLAIN ${sql.trim().replace(/;\s*$/, '')}`);
    res.json({ success: true, rows: result.rows, columns: result.columns });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/db/stats ────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const engine = getEngine();
    let rows = [];
    if (engine === 'mysql') {
      const r = await db.query(`
        SELECT table_name, table_rows,
          ROUND(data_length / 1024, 1) AS data_kb,
          ROUND(index_length / 1024, 1) AS index_kb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY table_rows DESC
      `);
      rows = r.rows;
    } else if (engine === 'postgresql') {
      const r = await db.query(`
        SELECT relname AS table_name,
          n_live_tup AS table_rows,
          ROUND(pg_relation_size(quote_ident(relname)) / 1024.0, 1) AS data_kb,
          ROUND(pg_indexes_size(quote_ident(relname)) / 1024.0, 1) AS index_kb
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);
      rows = r.rows;
    } else {
      // SQLite: use sqlite_master to list tables, no size info available
      const r = await db.query("SELECT name AS table_name, 0 AS table_rows, 0 AS data_kb, 0 AS index_kb FROM sqlite_master WHERE type='table' ORDER BY name");
      rows = r.rows;
    }
    res.json({ success: true, rows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── POST /api/db/foreign-keys ────────────────────────────────────
router.post('/foreign-keys', async (req, res) => {
  try {
    const engine = getEngine();
    let rows = [];
    if (engine === 'mysql') {
      const r = await db.query(`
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
      rows = r.rows;
    } else if (engine === 'postgresql') {
      const r = await db.query(`
        SELECT
          kcu.table_name        AS from_table,
          kcu.column_name       AS from_column,
          ccu.table_name        AS to_table,
          ccu.column_name       AS to_column,
          tc.constraint_name    AS constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY kcu.table_name
      `);
      rows = r.rows;
    } else {
      // SQLite: parse FK info from PRAGMA
      const schema = await db.getSchema ? db.getSchema() : {};
      // Return empty for SQLite - PRAGMA foreign_key_list needs per-table calls
      rows = [];
    }
    res.json({ success: true, rows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message, rows: [] });
  }
});

// ── module.exports must be LAST ──────────────────────────────────
module.exports = router;