// backend/routes/simulator.js
// Real query simulation: EXPLAIN ANALYZE, join algorithm comparisons, index analysis
// Works with PostgreSQL, MySQL, and SQLite

const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ── Helpers ──────────────────────────────────────────────────────

function sanitize(sql) {
  const s = sql.trim().replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!s) return { ok: false, error: 'Empty query' };
  const first = s.split(/\s+/)[0].toUpperCase();
  if (first !== 'SELECT') return { ok: false, error: `Only SELECT queries allowed, got ${first}` };
  if (s.split(';').filter(x => x.trim()).length > 1) return { ok: false, error: 'Multiple statements not allowed' };
  // BUG FIX #4: use word-boundary matching so table names like "order_executions" aren't blocked
  const blocked = ['DROP','TRUNCATE','ALTER','CREATE','GRANT','REVOKE','EXECUTE','EXEC'];
  for (const kw of blocked) {
    if (new RegExp(`\\b${kw}\\b`).test(s.toUpperCase())) {
      return { ok: false, error: `Blocked keyword: ${kw}` };
    }
  }
  // Strip trailing semicolon so subquery wrapping (COUNT(*) FROM (...)) never breaks
  const cleanSql = s.replace(/;\s*$/, '').trim();
  return { ok: true, sql: cleanSql };
}

// Extract table names from query
function extractTables(sql) {
  const tables = [];
  const re = /(?:FROM|JOIN)\s+`?(\w+)`?/gi;
  let m;
  while ((m = re.exec(sql))) tables.push(m[1].toLowerCase());
  return [...new Set(tables)];
}

// Detect join type used in query
function detectJoinType(sql) {
  const u = sql.toUpperCase();
  if (/FULL\s+OUTER\s+JOIN/.test(u)) return 'FULL OUTER JOIN';
  if (/LEFT\s+JOIN/.test(u)) return 'LEFT JOIN';
  if (/RIGHT\s+JOIN/.test(u)) return 'RIGHT JOIN';
  if (/CROSS\s+JOIN/.test(u)) return 'CROSS JOIN';
  if (/INNER\s+JOIN/.test(u)) return 'INNER JOIN';
  if (/JOIN/.test(u)) return 'INNER JOIN';
  return null;
}

// Replace join type in query
function replaceJoin(sql, newJoin) {
  // Only replace the FIRST join keyword to avoid corrupting multi-join queries
  return sql.replace(/(FULL\s+OUTER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN|INNER\s+JOIN|JOIN)/i, newJoin);
}

// BUG FIX #1: Reliable engine detection using dialect-specific queries
async function detectEngine() {
  try {
    await db.query("SELECT current_setting('server_version_num')");
    return 'postgresql';
  } catch {}
  try {
    const r = await db.query('SELECT @@version AS v');
    // Only return mysql if we actually got a result (not a "no connection" error)
    if (r && r.rows && r.rows.length > 0) return 'mysql';
  } catch {}
  // Check if there is actually a SQLite connection before falling through
  try {
    await db.query('SELECT 1');
    return 'sqlite';
  } catch (err) {
    throw new Error('No database connected. Please connect first via the Connect tab.');
  }
}

// ── POST /api/simulator/analyze ─────────────────────────────────
router.post('/analyze', async (req, res) => {
  const { sql: rawSql } = req.body;
  const san = sanitize(rawSql || '');
  if (!san.ok) return res.status(400).json({ success: false, error: san.error });
  const sql = san.sql;

  try {
    const detectedEngine = await detectEngine();
    const result = await runFullAnalysis(sql, detectedEngine);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

async function runFullAnalysis(sql, engine) {
  const result = {
    sql,
    engine,
    executionPlan: null,
    executionTimeMs: 0,
    rowsReturned: 0,
    planningTimeMs: 0,
    traditionalPlan: [],
    indexComparison: null,
    joinComparison: null,
    joinAlgorithmComparison: null,
    performanceTips: [],
    statistics: {},
  };

  if (engine === 'postgresql') {
    result.executionPlan = await pgExplainAnalyze(sql);
    result.executionTimeMs = result.executionPlan?.executionTime || 0;
    result.planningTimeMs  = result.executionPlan?.planningTime  || 0;
    result.rowsReturned    = result.executionPlan?.rootNode?.actualRows || 0;
  } else if (engine === 'mysql') {
    result.executionPlan = await mysqlExplainAnalyze(sql);
    result.executionTimeMs = result.executionPlan?.executionTime || 0;
    result.traditionalPlan = result.executionPlan?.traditionalRows || [];
  } else {
    const t0 = Date.now();
    const r = await db.query(sql);
    result.executionTimeMs = Date.now() - t0;
    result.rowsReturned = r.rowCount;
    result.executionPlan = { note: 'SQLite does not support EXPLAIN ANALYZE in this mode', executionTime: result.executionTimeMs };
  }

  try {
    const r = await db.query(`SELECT COUNT(*) as cnt FROM (${sql}) AS __subq`);
    result.rowsReturned = parseInt(r.rows[0]?.cnt || r.rows[0]?.CNT || 0);
  } catch {}

  if (engine === 'postgresql' || engine === 'mysql') {
    result.indexComparison = await runIndexComparison(sql, engine);
  }

  if (detectJoinType(sql)) {
    result.joinComparison = await runJoinComparison(sql, engine);
    result.joinAlgorithmComparison = await runJoinAlgorithmComparison(sql, engine);
  }

  result.performanceTips = generateTips(result);
  result.statistics = buildStats(sql, result);

  return result;
}

// ── PostgreSQL EXPLAIN ANALYZE ────────────────────────────────────
async function pgExplainAnalyze(sql) {
  try {
    const r = await db.query(`EXPLAIN (ANALYZE true, COSTS true, TIMING true, FORMAT JSON) ${sql}`);
    const plan = r.rows[0]['QUERY PLAN'][0];
    return {
      executionTime: plan['Execution Time'] || 0,
      planningTime:  plan['Planning Time']  || 0,
      rootNode: parsePgNode(plan.Plan),
      rawJson: plan,
    };
  } catch (err) {
    try {
      const r = await db.query(`EXPLAIN (FORMAT JSON) ${sql}`);
      const plan = r.rows[0]['QUERY PLAN'][0];
      return {
        executionTime: 0,
        planningTime: 0,
        rootNode: parsePgNode(plan.Plan),
        rawJson: plan,
        note: 'Used estimated plan (ANALYZE not available)',
      };
    } catch {
      return { error: err.message };
    }
  }
}

function parsePgNode(node) {
  if (!node) return null;
  return {
    nodeType:         node['Node Type'],
    relation:         node['Relation Name'],
    alias:            node['Alias'],
    startupCost:      node['Startup Cost'],
    totalCost:        node['Total Cost'],
    planRows:         node['Plan Rows'],
    planWidth:        node['Plan Width'],
    actualStartupTime: node['Actual Startup Time'],
    actualTotalTime:  node['Actual Total Time'],
    actualRows:       node['Actual Rows'],
    actualLoops:      node['Actual Loops'],
    filter:           node['Filter'],
    joinType:         node['Join Type'],
    indexName:        node['Index Name'],
    indexCond:        node['Index Cond'],
    sharedHitBlocks:  node['Shared Hit Blocks'],
    sharedReadBlocks: node['Shared Read Blocks'],
    children:         (node['Plans'] || []).map(parsePgNode),
  };
}

// ── MySQL EXPLAIN ANALYZE ─────────────────────────────────────────
async function mysqlExplainAnalyze(sql) {
  const result = { executionTime: 0, traditionalRows: [], treeOutput: '', jsonPlan: null };

  try {
    const r = await db.query(`EXPLAIN ${sql}`);
    result.traditionalRows = r.rows.map(row => {
      // Normalize keys — MySQL drivers may return ANY casing
      const norm = {};
      for (const k of Object.keys(row)) norm[k.toLowerCase()] = row[k];
      return {
        id:           norm.id,
        selectType:   norm.select_type,
        table:        norm.table,
        type:         norm.type,
        possibleKeys: norm.possible_keys,
        key:          norm.key,
        keyLen:       norm.key_len,
        ref:          norm.ref,
        rows:         norm.rows,
        filtered:     norm.filtered,
        extra:        norm.extra,
      };
    });
  } catch {}

  try {
    const r = await db.query(`EXPLAIN FORMAT=JSON ${sql}`);
    result.jsonPlan = JSON.parse(r.rows[0].EXPLAIN || '{}');
    result.estimatedCost = parseFloat(result.jsonPlan?.query_block?.cost_info?.query_cost || '0');
  } catch {}

  try {
    const r = await db.query(`EXPLAIN ANALYZE ${sql}`);
    const treeRows = r.rows.map(row => Object.values(row)[0]).join('\n');
    result.treeOutput = treeRows;
    const m = treeRows.match(/actual time=([\d.]+)\.\.([\d.]+)/);
    if (m) result.executionTime = parseFloat(m[2]);
  } catch {
    const t0 = Date.now();
    try { await db.query(sql); } catch {}
    result.executionTime = Date.now() - t0;
  }

  return result;
}

// ── Index Comparison ──────────────────────────────────────────────
async function runIndexComparison(sql, engine) {
  // Run WITHOUT indexes first (cold cache), then WITH indexes.
  // This avoids warm-buffer skew where the second run always looks faster.
  const withoutIdx = await measureQuery(sql, engine, true);
  const withIdx    = await measureQuery(sql, engine, false);
  const timeDiff   = withoutIdx.timeMs - withIdx.timeMs;
  const timePct    = withoutIdx.timeMs > 0 ? (timeDiff / withoutIdx.timeMs) * 100 : 0;

  // If indexes appear slower AND scan type is the same, the column is likely wrapped
  // in a function (e.g. DATE(col)) which defeats index usage even with IGNORE INDEX removed.
  const indexesAppearedSlower = timeDiff < 0 && withIdx.scanType === withoutIdx.scanType;

  return {
    withIndex:    withIdx,
    withoutIndex: withoutIdx,
    indexesAppearedSlower,
    improvement: {
      timeReductionMs:      timeDiff,
      timeReductionPercent: Math.round(timePct * 10) / 10,
      scanChange:           `${withoutIdx.scanType} → ${withIdx.scanType}`,
    },
  };
}

async function measureQuery(sql, engine, disableIndexes) {
  const out = { timeMs: 0, scanType: 'Unknown', keyUsed: null, rowsExamined: 0, explainOutput: '' };

  if (engine === 'postgresql') {
    // BUG FIX #2: guarantee ROLLBACK in finally
    let txStarted = false;
    try {
      if (disableIndexes) {
        await db.query('BEGIN');
        txStarted = true;
        await db.query('SET LOCAL enable_indexscan = off');
        await db.query('SET LOCAL enable_indexonlyscan = off');
        await db.query('SET LOCAL enable_bitmapscan = off');
      }
      const r = await db.query(`EXPLAIN (ANALYZE true, COSTS true, TIMING true, FORMAT JSON) ${sql}`);
      const plan = r.rows[0]['QUERY PLAN'][0];
      out.timeMs  = plan['Execution Time'] || 0;
      out.scanType = extractPgScanType(plan.Plan);
      out.keyUsed  = extractPgIndexName(plan.Plan);
      out.explainOutput = JSON.stringify(plan.Plan, null, 2);
    } catch {
      out.timeMs = 0;
      out.scanType = 'Error';
    } finally {
      if (disableIndexes && txStarted) {
        try { await db.query('ROLLBACK'); } catch {}
      }
    }

  } else if (engine === 'mysql') {
    try {
      const tables = extractTables(sql);
      let querySql = sql;

      if (disableIndexes) {
        for (const table of tables) {
          try {
            const idxR = await db.query(`SHOW INDEX FROM \`${table}\``);
            // Normalize key casing — MySQL drivers may return Key_name or key_name
            const idxNames = [...new Set(idxR.rows
              .map(r => {
                const norm = {};
                for (const k of Object.keys(r)) norm[k.toLowerCase()] = r[k];
                return norm.key_name;
              })
              .filter(name => name && name !== 'PRIMARY')
            )];
            if (idxNames.length) {
              querySql = querySql.replace(
                new RegExp(`(FROM|JOIN)\\s+\`?${table}\`?(?=\\s|$)`, 'i'),
                `$1 \`${table}\` IGNORE INDEX (${idxNames.join(',')})`
              );
            }
          } catch {}
        }
      }

      // Run query twice and take the MINIMUM to reduce cache/warm-up skew
      let times = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await db.query(`EXPLAIN ANALYZE ${querySql}`);
          const treeOutput = r.rows.map(row => Object.values(row)[0]).join('\n');
          if (attempt === 0) out.explainOutput = treeOutput;
          const m = treeOutput.match(/actual time=([\d.]+)\.\.([\d.]+)/);
          if (m) times.push(parseFloat(m[2]));
        } catch {
          const t0 = Date.now();
          try { await db.query(querySql); } catch {}
          times.push(Date.now() - t0);
        }
      }
      if (times.length > 0) out.timeMs = Math.min(...times);

      // Normalize EXPLAIN column casing
      try {
        const r = await db.query(`EXPLAIN ${querySql}`);
        const rows = r.rows;
        if (rows.length) {
          const norm = {};
          for (const k of Object.keys(rows[0])) norm[k.toLowerCase()] = rows[0][k];
          out.scanType     = norm.type || 'ALL';
          out.keyUsed      = norm.key  || null;
          out.rowsExamined = rows.reduce((s, row) => {
            const n = {};
            for (const k of Object.keys(row)) n[k.toLowerCase()] = row[k];
            return s + (n.rows || 0);
          }, 0);
        }
      } catch {}

    } catch {
      out.timeMs = 0;
    }
  }

  return out;
}

function extractPgScanType(node) {
  if (!node) return 'Unknown';
  if (node['Node Type']?.includes('Scan')) return node['Node Type'];
  for (const child of (node['Plans'] || [])) {
    const t = extractPgScanType(child);
    if (t !== 'Unknown') return t;
  }
  return node['Node Type'] || 'Unknown';
}

function extractPgIndexName(node) {
  if (!node) return null;
  if (node['Index Name']) return node['Index Name'];
  for (const child of (node['Plans'] || [])) {
    const t = extractPgIndexName(child);
    if (t) return t;
  }
  return null;
}

// ── Join Type Comparison ──────────────────────────────────────────
async function runJoinComparison(sql, engine) {
  const joinTypes = engine === 'postgresql'
    ? ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN']
    : ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN'];

  const results = [];

  for (const jt of joinTypes) {
    const modified = replaceJoin(sql, jt);
    try {
      let timeMs = 0, rowCount = 0, scanType = 'Unknown', planOutput = '';

      if (engine === 'postgresql') {
        try {
          const r = await db.query(`EXPLAIN (ANALYZE true, TIMING true, FORMAT JSON) ${modified}`);
          const plan = r.rows[0]['QUERY PLAN'][0];
          timeMs    = plan['Execution Time'] || 0;
          scanType  = extractPgScanType(plan.Plan);
          planOutput = plan.Plan?.['Node Type'] || '';
        } catch {
          const t0 = Date.now();
          await db.query(modified);
          timeMs = Date.now() - t0;
        }
      } else if (engine === 'mysql') {
        try {
          const r = await db.query(`EXPLAIN ANALYZE ${modified}`);
          const tree = r.rows.map(row => Object.values(row)[0]).join('\n');
          const m = tree.match(/actual time=([\d.]+)\.\.([\d.]+)/);
          if (m) timeMs = parseFloat(m[2]);
          planOutput = tree.split('\n')[0];
        } catch {
          const t0 = Date.now();
          await db.query(modified);
          timeMs = Date.now() - t0;
        }
        try {
          const r = await db.query(`EXPLAIN ${modified}`);
          if (r.rows.length) scanType = r.rows[0].type || 'ALL';
        } catch {}
      }

      // Skip COUNT(*) for CROSS JOIN -- cartesian product can be millions of rows
      if (jt !== 'CROSS JOIN') {
        try {
          const cr = await db.query(`SELECT COUNT(*) as cnt FROM (${modified}) AS __cntq`);
          rowCount = parseInt(cr.rows[0]?.cnt || 0);
        } catch {}
      }

      results.push({ joinType: jt, timeMs, rowCount, scanType, planOutput, success: true });
    } catch (err) {
      results.push({ joinType: jt, timeMs: 0, rowCount: 0, scanType: 'Error', success: false, error: err.message });
    }
  }

  const valid = results.filter(r => r.success && r.timeMs > 0);
  const best  = valid.length ? valid.reduce((a, b) => b.timeMs < a.timeMs ? b : a) : null;

  return { comparisons: results, bestJoinType: best?.joinType || null };
}

// ── JOIN ALGORITHM COMPARISON ─────────────────────────────────────
// Simulates Nested Loop, Hash Join, and Merge Sort Join by using
// database-level optimizer hints/settings to force each algorithm.
async function runJoinAlgorithmComparison(sql, engine) {
  const algorithms = [
    { id: 'nested_loop', name: 'Nested Loop Join', shortName: 'Nested Loop' },
    { id: 'hash',        name: 'Hash Join',         shortName: 'Hash Join'   },
    { id: 'merge',       name: 'Merge Sort Join',   shortName: 'Merge Sort'  },
  ];

  const results = [];

  for (const algo of algorithms) {
    const entry = {
      id:             algo.id,
      name:           algo.name,
      shortName:      algo.shortName,
      timeMs:         null,
      planningTimeMs: 0,
      rowCount:       0,
      planNodeType:   null,
      explanation:    '',
      supported:      false,
      success:        false,
      error:          null,
      characteristics: algoCharacteristics(algo.id),
    };

    if (engine === 'postgresql') {
      let txStarted = false;
      try {
        await db.query('BEGIN');
        txStarted = true;

        if (algo.id === 'nested_loop') {
          await db.query('SET LOCAL enable_hashjoin = off');
          await db.query('SET LOCAL enable_mergejoin = off');
          await db.query('SET LOCAL enable_nestloop = on');
        } else if (algo.id === 'hash') {
          await db.query('SET LOCAL enable_nestloop = off');
          await db.query('SET LOCAL enable_mergejoin = off');
          await db.query('SET LOCAL enable_hashjoin = on');
        } else if (algo.id === 'merge') {
          await db.query('SET LOCAL enable_nestloop = off');
          await db.query('SET LOCAL enable_hashjoin = off');
          await db.query('SET LOCAL enable_mergejoin = on');
        }

        const r = await db.query(`EXPLAIN (ANALYZE true, COSTS true, TIMING true, FORMAT JSON) ${sql}`);
        const plan = r.rows[0]['QUERY PLAN'][0];
        entry.timeMs        = plan['Execution Time'] || 0;
        entry.planningTimeMs = plan['Planning Time']  || 0;
        entry.planNodeType  = findJoinNodeType(plan.Plan);
        entry.rowCount      = findActualRows(plan.Plan);
        entry.supported     = true;
        entry.success       = true;
        entry.explanation   = algoExplanation(algo.id, entry.planNodeType);

      } catch (err) {
        entry.error = err.message;
      } finally {
        if (txStarted) {
          try { await db.query('ROLLBACK'); } catch {}
        }
      }

    } else if (engine === 'mysql') {
      const hintedSql = buildMySQLHintedQuery(sql, algo.id);
      try {
        const r = await db.query(`EXPLAIN ANALYZE ${hintedSql}`);
        const treeOutput = r.rows.map(row => Object.values(row)[0]).join('\n');
        const m = treeOutput.match(/actual time=([\d.]+)\.\.([\d.]+)/);
        if (m) entry.timeMs = parseFloat(m[2]);
        entry.planNodeType = detectMySQLJoinType(treeOutput);
        entry.supported    = true;
        entry.success      = true;
        entry.explanation  = algoExplanation(algo.id, entry.planNodeType);
        try {
          const cr = await db.query(`SELECT COUNT(*) as cnt FROM (${hintedSql}) AS __cntq`);
          entry.rowCount = parseInt(cr.rows[0]?.cnt || 0);
        } catch {}
      } catch {
        try {
          const t0 = Date.now();
          await db.query(hintedSql);
          entry.timeMs      = Date.now() - t0;
          entry.supported   = true;
          entry.success     = true;
          entry.explanation = algoExplanation(algo.id, null);
        } catch (err2) {
          entry.error = err2.message;
        }
      }

    } else {
      // SQLite: only nested loop is supported
      entry.supported   = algo.id === 'nested_loop';
      entry.explanation = sqliteAlgoNote(algo.id);
      if (algo.id === 'nested_loop') {
        try {
          const t0 = Date.now();
          await db.query(sql);
          entry.timeMs  = Date.now() - t0;
          entry.success = true;
        } catch (err) {
          entry.error = err.message;
        }
      } else {
        entry.success = true; // show row with explanation even if not runnable
      }
    }

    results.push(entry);
  }

  const valid = results.filter(r => r.success && r.supported && r.timeMs != null && r.timeMs > 0);
  const fastest = valid.length ? valid.reduce((a, b) => b.timeMs < a.timeMs ? b : a) : null;

  return {
    comparisons:     results,
    fastestAlgo:     fastest?.id || null,
    fastestName:     fastest?.name || null,
    recommendation:  buildAlgoRecommendation(results, sql),
  };
}

function findJoinNodeType(node) {
  if (!node) return null;
  const nt = node['Node Type'] || '';
  if (nt.includes('Hash Join') || nt.includes('Merge Join') || nt.includes('Nested Loop')) return nt;
  for (const child of (node['Plans'] || [])) {
    const found = findJoinNodeType(child);
    if (found) return found;
  }
  return node['Node Type'] || null;
}

function findActualRows(node) {
  if (!node) return 0;
  return node['Actual Rows'] || 0;
}

function buildMySQLHintedQuery(sql, algoId) {
  // MySQL optimizer hints go right after SELECT keyword
  const selectIdx = sql.toUpperCase().indexOf('SELECT');
  if (selectIdx === -1) return sql;
  const afterSelect = selectIdx + 6; // length of "SELECT"
  if (algoId === 'hash') {
    return sql.slice(0, afterSelect) + ' /*+ HASH_JOIN() */ ' + sql.slice(afterSelect);
  } else if (algoId === 'nested_loop') {
    return sql.slice(0, afterSelect) + ' /*+ NO_HASH_JOIN() NO_MERGE() */ ' + sql.slice(afterSelect);
  }
  return sql;
}

function detectMySQLJoinType(treeOutput) {
  const u = treeOutput.toLowerCase();
  if (u.includes('hash join'))    return 'Hash Join';
  if (u.includes('nested loop'))  return 'Nested Loop';
  if (u.includes('sort merge'))   return 'Merge Join';
  if (u.includes('inner hash'))   return 'Hash Join (inner)';
  return 'Loop';
}

function algoExplanation(algoId, planNodeType) {
  const map = {
    nested_loop: planNodeType
      ? `Database used ${planNodeType}. Each outer row was matched against inner rows one-by-one.`
      : 'Nested Loop: For each outer row, scans the inner table. Simple and low-memory, but O(n×m) cost.',
    hash: planNodeType
      ? `Database used ${planNodeType}. Smaller table hashed into memory, larger table probed against it.`
      : 'Hash Join: Builds a hash table from the smaller relation, then probes with the larger. O(n+m) average, requires memory.',
    merge: planNodeType
      ? `Database used ${planNodeType}. Both inputs sorted on join key, then merged linearly.`
      : 'Merge Sort Join: Both tables sorted on join key, then merged in one pass. O(n log n) sort cost, then O(n+m) merge.',
  };
  return map[algoId] || '';
}

function sqliteAlgoNote(algoId) {
  if (algoId === 'nested_loop') return 'SQLite uses Nested Loop join — the only algorithm it supports.';
  if (algoId === 'hash') return 'SQLite does not implement Hash Join natively.';
  if (algoId === 'merge') return 'SQLite does not implement Sort-Merge Join natively.';
  return '';
}

function algoCharacteristics(algoId) {
  const map = {
    nested_loop: {
      timeComplexity:  'O(n × m)',
      spaceComplexity: 'O(1)',
      bestCase:        'Small inner table with index',
      worstCase:       'Large unindexed tables',
      supportsRange:   true,
      requiresSort:    false,
      requiresMemory:  false,
      parallelizable:  false,
    },
    hash: {
      timeComplexity:  'O(n + m)',
      spaceComplexity: 'O(min(n,m))',
      bestCase:        'Large equality joins on unsorted data',
      worstCase:       'Many hash collisions, low memory',
      supportsRange:   false,
      requiresSort:    false,
      requiresMemory:  true,
      parallelizable:  true,
    },
    merge: {
      timeComplexity:  'O(n log n + m log m)',
      spaceComplexity: 'O(n + m)',
      bestCase:        'Pre-sorted inputs or indexed join key',
      worstCase:       'Unsorted large tables with no index',
      supportsRange:   true,
      requiresSort:    true,
      requiresMemory:  true,
      parallelizable:  true,
    },
  };
  return map[algoId] || {};
}

function buildAlgoRecommendation(results, sql) {
  const lines = [];
  const nl    = results.find(r => r.id === 'nested_loop');
  const hash  = results.find(r => r.id === 'hash');
  const merge = results.find(r => r.id === 'merge');

  if (hash?.success && hash.timeMs != null && nl?.timeMs != null && hash.timeMs < nl.timeMs) {
    lines.push('Hash join outperformed nested loop here — typical for large equality joins without a usable index.');
  }
  if (merge?.success && merge.timeMs != null && merge.timeMs < (hash?.timeMs || Infinity)) {
    lines.push('Merge sort join was fastest — usually means join columns are indexed or data is pre-sorted.');
  }

  const tables = extractTables(sql);
  if (tables.length === 2) {
    lines.push('For two-table joins: index the join column for nested loop or merge sort advantage. For large unindexed equality joins, hash join usually wins.');
  }

  return lines.join(' ');
}

// ── Performance Tips ──────────────────────────────────────────────
function generateTips(analysis) {
  const tips = [];
  const { executionTimeMs, executionPlan, indexComparison, joinAlgorithmComparison } = analysis;

  if (executionTimeMs > 1000) {
    tips.push({ severity: 'critical', category: 'Execution Time',
      message: `Query took ${executionTimeMs.toFixed(0)}ms — over 1 second`,
      suggestion: 'Add indexes, reduce JOINs, or limit result sets with WHERE/LIMIT' });
  }

  const plan = executionPlan?.rootNode;
  if (plan) {
    const checkNode = (n) => {
      if (!n) return;
      if (n.nodeType === 'Seq Scan' && (n.actualRows || n.planRows) > 10000) {
        tips.push({ severity: 'warning', category: 'Sequential Scan',
          message: `Sequential scan on "${n.relation}" reading ${(n.actualRows||n.planRows).toLocaleString()} rows`,
          suggestion: `CREATE INDEX on the WHERE/JOIN columns of "${n.relation}"` });
      }
      if (n.nodeType === 'Sort' && (n.actualRows || n.planRows) > 5000) {
        tips.push({ severity: 'info', category: 'Sort Operation',
          message: `Sort on ${(n.actualRows||n.planRows).toLocaleString()} rows`,
          suggestion: 'An index matching ORDER BY can eliminate the sort step' });
      }
      (n.children||[]).forEach(checkNode);
    };
    checkNode(plan);
  }

  const tradPlan = analysis.executionPlan?.traditionalRows || [];
  for (const row of tradPlan) {
    if (row.type === 'ALL' && (row.rows || 0) > 1000) {
      tips.push({ severity: 'critical', category: 'Full Table Scan',
        message: `Full table scan on "${row.table}" (${(row.rows||0).toLocaleString()} rows)`,
        suggestion: `CREATE INDEX on the filtered columns of "${row.table}"` });
    }
    if ((row.extra||'').includes('filesort')) {
      tips.push({ severity: 'warning', category: 'Filesort',
        message: `"${row.table}" requires file-sort`,
        suggestion: 'Add an index matching your ORDER BY clause' });
    }
    if ((row.extra||'').includes('temporary')) {
      tips.push({ severity: 'warning', category: 'Temp Table',
        message: `Query creates a temp table on "${row.table}"`,
        suggestion: 'Restructure GROUP BY or add composite indexes' });
    }
  }

  if (indexComparison?.improvement?.timeReductionPercent > 30) {
    tips.push({ severity: 'info', category: 'Index Benefit',
      message: `Indexes provide ${indexComparison.improvement.timeReductionPercent.toFixed(0)}% speedup`,
      suggestion: 'Keep existing indexes and ensure query uses them' });
  }

  if (joinAlgorithmComparison?.fastestAlgo && joinAlgorithmComparison.fastestAlgo !== 'nested_loop') {
    const fastest = joinAlgorithmComparison.comparisons.find(r => r.id === joinAlgorithmComparison.fastestAlgo);
    const nested  = joinAlgorithmComparison.comparisons.find(r => r.id === 'nested_loop');
    if (fastest && nested && fastest.timeMs != null && nested.timeMs != null && nested.timeMs > 0) {
      const pct = Math.round(((nested.timeMs - fastest.timeMs) / nested.timeMs) * 100);
      if (pct > 10) {
        tips.push({ severity: 'info', category: 'Join Algorithm',
          message: `${fastest.name} is ${pct}% faster than Nested Loop for this join`,
          suggestion: fastest.id === 'hash'
            ? 'Ensure join_buffer_size / work_mem is adequate for hash joins'
            : 'Add an index on the join column to let merge sort join avoid sorting overhead' });
      }
    }
  }

  return tips;
}

function buildStats(sql, result) {
  const u = sql.toUpperCase();
  return {
    joinCount:      (u.match(/\bJOIN\b/g) || []).length,
    filterCount:    (u.match(/\bWHERE\b|\bAND\b|\bHAVING\b/g) || []).length,
    sortOps:        (u.match(/\bORDER\s+BY\b/g) || []).length,
    aggregations:   (u.match(/\bCOUNT\b|\bSUM\b|\bAVG\b|\bMIN\b|\bMAX\b/g) || []).length,
    subqueries:     (u.match(/\(\s*SELECT\b/g) || []).length,
    tablesAccessed: extractTables(sql),
  };
}

// ── POST /api/simulator/explain ──────────────────────────────────
router.post('/explain', async (req, res) => {
  const { sql: rawSql } = req.body;
  const san = sanitize(rawSql || '');
  if (!san.ok) return res.status(400).json({ success: false, error: san.error });

  try {
    const detectedEngine = await detectEngine();
    let plan;
    if (detectedEngine === 'postgresql') {
      plan = await pgExplainAnalyze(san.sql);
    } else if (detectedEngine === 'mysql') {
      plan = await mysqlExplainAnalyze(san.sql);
    } else {
      const t0 = Date.now();
      await db.query(san.sql);
      plan = { executionTime: Date.now() - t0 };
    }
    res.json({ success: true, plan, engine: detectedEngine });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /api/simulator/join-algorithms ─────────────────────────
// Standalone endpoint for join algorithm comparison only
router.post('/join-algorithms', async (req, res) => {
  const { sql: rawSql } = req.body;
  const san = sanitize(rawSql || '');
  if (!san.ok) return res.status(400).json({ success: false, error: san.error });

  if (!detectJoinType(san.sql)) {
    return res.status(400).json({
      success: false,
      error: 'Query must contain a JOIN clause to compare algorithms',
    });
  }

  try {
    const detectedEngine = await detectEngine();
    const result = await runJoinAlgorithmComparison(san.sql, detectedEngine);
    res.json({ success: true, engine: detectedEngine, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;