// backend/db/connection.js

const { Pool }   = require('pg');
const mysql      = require('mysql2/promise');
const Database   = require('better-sqlite3');

let activeConnection = null;
let activeEngine     = null;

// ── Connect ──────────────────────────────────────────────────────
async function connect(config) {
  const { engine, host, port, user, password, database, filepath } = config;
  activeEngine = engine;

  if (engine === 'postgresql') {
    activeConnection = new Pool({
      host:     host     || 'localhost',
      port:     parseInt(port) || 5432,
      user:     user     || 'postgres',
      password: password || '',
      database: database || 'postgres',
    });
    await activeConnection.query('SELECT 1');

  } else if (engine === 'mysql') {
    activeConnection = await mysql.createConnection({
      host:     host     || 'localhost',
      port:     parseInt(port) || 3306,
      user:     user     || 'root',
      password: password || '',
      database: database || 'mysql',
    });
    await activeConnection.query('SELECT 1');

  } else if (engine === 'sqlite') {
    activeConnection = new Database(filepath || ':memory:');
  }

  return { success: true, engine };
}

// ── Execute query ─────────────────────────────────────────────────
async function query(sql, params = []) {
  if (!activeConnection) {
    throw new Error('No database connected. Please connect first.');
  }

  const start = Date.now();

  if (activeEngine === 'postgresql') {
    const result = await activeConnection.query(sql, params);
    return {
      rows:     result.rows,
      columns:  result.fields ? result.fields.map(f => f.name) : [],
      rowCount: result.rowCount,
      time:     Date.now() - start,
    };

  } else if (activeEngine === 'mysql') {
    const [rows, fields] = await activeConnection.execute(sql, params);
    return {
      rows,
      columns:  fields ? fields.map(f => f.name) : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      time:     Date.now() - start,
    };

  } else if (activeEngine === 'sqlite') {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      const stmt = activeConnection.prepare(sql);
      const rows = stmt.all(params);
      return {
        rows,
        columns:  rows.length > 0 ? Object.keys(rows[0]) : [],
        rowCount: rows.length,
        time:     Date.now() - start,
      };
    } else {
      const stmt   = activeConnection.prepare(sql);
      const result = stmt.run(params);
      return {
        rows:     [],
        columns:  [],
        rowCount: result.changes,
        time:     Date.now() - start,
      };
    }
  }
}

// ── Get Schema ────────────────────────────────────────────────────
async function getSchema() {
  if (!activeConnection) return {};

  if (activeEngine === 'postgresql') {
    const result = await activeConnection.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_name = t.table_name
        AND c.table_schema = t.table_schema
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      ) pk ON pk.table_name = c.table_name
          AND pk.column_name = c.column_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `);
    return buildSchema(result.rows, {
      table:   'table_name',
      column:  'column_name',
      type:    'data_type',
      nullable:'is_nullable',
      pk:      'is_primary_key',
    });

  } else if (activeEngine === 'mysql') {
    // ── KEY FIX: MySQL returns UPPERCASE field names ──────────────
    // We query information_schema and normalise everything manually
    const [rows] = await activeConnection.execute(`
      SELECT
        c.TABLE_NAME        AS table_name,
        c.COLUMN_NAME       AS column_name,
        c.DATA_TYPE         AS data_type,
        c.IS_NULLABLE       AS is_nullable,
        c.COLUMN_DEFAULT    AS column_default,
        c.COLUMN_KEY        AS column_key,
        c.ORDINAL_POSITION  AS ordinal_position
      FROM information_schema.COLUMNS c
      JOIN information_schema.TABLES t
        ON c.TABLE_NAME   = t.TABLE_NAME
        AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
      WHERE c.TABLE_SCHEMA = DATABASE()
        AND t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
    `);

    // Build schema from normalised rows
    const schema = {};

    for (const row of rows) {
      // Use lowercase aliases we set with AS above
      const tableName  = row.table_name  || row.TABLE_NAME;
      const columnName = row.column_name || row.COLUMN_NAME;
      const dataType   = row.data_type   || row.DATA_TYPE   || 'unknown';
      const isNullable = row.is_nullable || row.IS_NULLABLE || 'YES';
      const columnKey  = row.column_key  || row.COLUMN_KEY  || '';

      // Skip if names are still undefined
      if (!tableName || !columnName) continue;

      if (!schema[tableName]) {
        schema[tableName] = { columns: [], rows: 0 };
      }

      schema[tableName].columns.push({
        column_name:    columnName,
        data_type:      dataType,
        is_nullable:    isNullable,
        is_primary_key: columnKey === 'PRI',
        column_default: row.column_default || row.COLUMN_DEFAULT || null,
      });
    }

    // Get row counts for each table
    for (const tableName of Object.keys(schema)) {
      try {
        const [countRows] = await activeConnection.execute(
          `SELECT COUNT(*) as cnt FROM \`${tableName}\``
        );
        schema[tableName].rows = countRows[0]?.cnt || 0;
      } catch (e) {
        schema[tableName].rows = 0;
      }
    }

    return schema;

  } else if (activeEngine === 'sqlite') {
    const tables = activeConnection
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    const schema = {};
    for (const table of tables) {
      const cols = activeConnection
        .prepare(`PRAGMA table_info(${table.name})`)
        .all();

      schema[table.name] = {
        columns: cols.map(c => ({
          column_name:    c.name,
          data_type:      c.type  || 'TEXT',
          is_nullable:    c.notnull ? 'NO' : 'YES',
          is_primary_key: c.pk === 1,
          column_default: c.dflt_value || null,
        })),
        rows: 0,
      };

      try {
        const count = activeConnection
          .prepare(`SELECT COUNT(*) as cnt FROM "${table.name}"`)
          .get();
        schema[table.name].rows = count?.cnt || 0;
      } catch (e) {
        schema[table.name].rows = 0;
      }
    }

    return schema;
  }
}

// ── Helper: build schema object from flat rows ────────────────────
function buildSchema(rows, fields) {
  const schema = {};
  for (const row of rows) {
    const tableName = row[fields.table];
    if (!tableName) continue;
    if (!schema[tableName]) {
      schema[tableName] = { columns: [], rows: 0 };
    }
    schema[tableName].columns.push({
      column_name:    row[fields.column],
      data_type:      row[fields.type],
      is_nullable:    row[fields.nullable],
      is_primary_key: row[fields.pk] === true || row[fields.pk] === 'PRI',
      column_default: row[fields.default] || null,
    });
  }
  return schema;
}

module.exports = { connect, query, getSchema };