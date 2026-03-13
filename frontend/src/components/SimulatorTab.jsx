// frontend/src/components/SimulatorTab.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store.jsx';

const STAGE_TEMPLATES = [
  { name: 'Lexical Analysis',      icon: '🔤', color: '#6366f1', desc: 'Breaking SQL into tokens' },
  { name: 'Syntax Parsing',        icon: '🌳', color: '#8b5cf6', desc: 'Building a parse tree' },
  { name: 'Semantic Analysis',     icon: '🔍', color: '#0ea5e9', desc: 'Validating names against schema' },
  { name: 'Query Optimization',    icon: '⚡', color: '#f59e0b', desc: 'Applying speed-up rules' },
  { name: 'Logical Plan',          icon: '📊', color: '#10b981', desc: 'Generating operator tree' },
  { name: 'Physical Plan',         icon: '⚙️', color: '#ef4444', desc: 'Choosing algorithms' },
  { name: 'Execution',             icon: '🚀', color: '#f97316', desc: 'Data flowing through pipeline' },
  { name: 'Result Materialization',icon: '✅', color: '#4ade80', desc: 'Collecting final results' },
];

// ── Parse SQL to extract real info ────────────────────────────────
function analyzeSQL(sql) {
  if (!sql) return null;
  const upper = sql.toUpperCase();

  // Detect query type
  const type = upper.startsWith('SELECT') ? 'SELECT'
    : upper.startsWith('INSERT') ? 'INSERT'
    : upper.startsWith('UPDATE') ? 'UPDATE'
    : upper.startsWith('DELETE') ? 'DELETE'
    : 'OTHER';

  // Extract table names from FROM and JOIN
  const tables = [];
  const fromMatch = sql.match(/FROM\s+`?(\w+)`?/gi) || [];
  const joinMatch = sql.match(/JOIN\s+`?(\w+)`?/gi) || [];
  [...fromMatch, ...joinMatch].forEach(m => {
    const t = m.replace(/FROM\s+|JOIN\s+/gi, '').replace(/`/g, '').trim();
    if (t && !tables.includes(t)) tables.push(t);
  });

  // Detect clauses
  const hasJoin    = /JOIN/i.test(sql);
  const hasWhere   = /WHERE/i.test(sql);
  const hasGroup   = /GROUP\s+BY/i.test(sql);
  const hasOrder   = /ORDER\s+BY/i.test(sql);
  const hasLimit   = /LIMIT/i.test(sql);
  const hasAgg     = /COUNT|SUM|AVG|MAX|MIN/i.test(sql);

  // Extract columns from SELECT
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/is);
  const columns = selectMatch
    ? selectMatch[1].split(',').map(c => c.trim().split(/\s+as\s+/i).pop().replace(/`/g, '')).slice(0, 4)
    : ['*'];

  return { type, tables, hasJoin, hasWhere, hasGroup, hasOrder, hasLimit, hasAgg, columns };
}

// ── Tokenize SQL for stage 0 ──────────────────────────────────────
function tokenize(sql) {
  const keywords = ['SELECT','FROM','WHERE','JOIN','ON','GROUP','ORDER',
    'BY','HAVING','LIMIT','INNER','LEFT','RIGHT','AS','AND','OR',
    'COUNT','SUM','AVG','MAX','MIN','DISTINCT','INSERT','UPDATE','DELETE'];
  const tokens = [];
  sql.split(/(\s+|,|;|\(|\)|=|<|>|\.|\*)/).forEach(w => {
    const t = w.trim();
    if (!t) return;
    if (keywords.includes(t.toUpperCase()))
      tokens.push({ text: t, type: 'keyword',  color: '#818cf8' });
    else if (/^'.*'$/.test(t) || /^\d+$/.test(t))
      tokens.push({ text: t, type: 'literal',  color: '#4ade80' });
    else if (/^[=<>*.,();]$/.test(t))
      tokens.push({ text: t, type: 'operator', color: '#e879f9' });
    else
      tokens.push({ text: t, type: 'name',     color: '#e2e8f0' });
  });
  return tokens;
}

export default function SimulatorTab() {
  const { lastQuery, schema } = useApp();

  const [sql,     setSql]     = useState('');
  const [stage,   setStage]   = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed,   setSpeed]   = useState(1);
  const [tokens,  setTokens]  = useState([]);
  const [analysis,setAnalysis]= useState(null);
  const timer = useRef(null);

  // Auto-load last executed query from Editor
  useEffect(() => {
    if (lastQuery?.sql) {
      setSql(lastQuery.sql);
    }
  }, [lastQuery]);

  // Auto-advance stages
  useEffect(() => {
    if (!playing) return;
    if (stage >= STAGE_TEMPLATES.length) { setPlaying(false); return; }
    timer.current = setTimeout(() => setStage(s => s + 1), 2400 / speed);
    return () => clearTimeout(timer.current);
  }, [stage, playing, speed]);

  function start() {
    const parsed = analyzeSQL(sql);
    setAnalysis(parsed);
    setTokens(tokenize(sql));
    setStage(0);
    setPlaying(true);
  }

  function reset() {
    setStage(-1);
    setPlaying(false);
    setTokens([]);
    setAnalysis(null);
  }

  const current = stage >= 0 && stage < STAGE_TEMPLATES.length
    ? STAGE_TEMPLATES[stage] : null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)' }}>

      {/* ── Left panel ─────────────────────────────────── */}
      <div style={{ width: 300, borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column' }}>

        {/* SQL input */}
        <div style={{ padding: 14, borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>SQL Query</div>
            {lastQuery && (
              <button onClick={() => setSql(lastQuery.sql)} style={{
                fontSize: 10, padding: '3px 8px', background: '#1e293b',
                border: '1px solid #334155', borderRadius: 5,
                color: '#818cf8', cursor: 'pointer' }}>
                ↺ Load last query
              </button>
            )}
          </div>
          <textarea value={sql} onChange={e => setSql(e.target.value)} rows={8}
            placeholder={lastQuery
              ? 'Last query loaded — click Start!'
              : 'Run a query in SQL Editor first, or type one here…'}
            style={{ width: '100%', background: '#07090f',
              border: '1px solid #1e293b', borderRadius: 8,
              color: '#e2e8f0', padding: 10, fontSize: 11,
              resize: 'none', fontFamily: 'monospace', lineHeight: 1.6 }}
          />
          {lastQuery && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#475569' }}>
              Last run: {lastQuery.rows} rows · {lastQuery.time}ms
            </div>
          )}
        </div>

        {/* Speed */}
        <div style={{ padding: 14, borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>SPEED</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0.5, 1, 2].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{
                flex: 1, padding: 6,
                background: speed === s ? '#1e293b' : 'none',
                border: '1px solid #1e293b', borderRadius: 6,
                color: speed === s ? '#e2e8f0' : '#64748b',
                fontSize: 12, cursor: 'pointer' }}>{s}x</button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: 14, borderBottom: '1px solid #1e293b' }}>
          {stage === -1 ? (
            <button onClick={start} disabled={!sql.trim()} style={{
              width: '100%', padding: 10, background: '#4f46e5',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: sql.trim() ? 1 : 0.4 }}>
              ▶ Start Simulation
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPlaying(p => !p)} style={{
                flex: 1, padding: 8, background: 'none',
                border: '1px solid #334155', borderRadius: 7,
                color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>
                {playing ? '⏸' : '▶'}
              </button>
              <button onClick={() => { setPlaying(false); setStage(s => Math.min(s+1, STAGE_TEMPLATES.length)); }}
                style={{ flex: 1, padding: 8, background: 'none',
                  border: '1px solid #334155', borderRadius: 7,
                  color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>⏭</button>
              <button onClick={reset} style={{
                flex: 1, padding: 8, background: 'none',
                border: '1px solid #334155', borderRadius: 7,
                color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>↺</button>
            </div>
          )}
        </div>

        {/* Stage checklist */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {STAGE_TEMPLATES.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center',
              gap: 10, padding: '8px 0',
              opacity: stage < i ? 0.3 : 1, transition: 'opacity 0.4s' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: stage > i ? '#052e16' : stage === i ? s.color+'20' : '#0d1117',
                border: `1px solid ${stage > i ? '#16a34a' : stage === i ? s.color : '#1e293b'}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13 }}>
                {stage > i ? '✓' : s.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: stage === i ? '#e2e8f0' : '#94a3b8',
                  fontWeight: stage === i ? 600 : 400 }}>{s.name}</div>
                <div style={{ fontSize: 9, color: '#475569' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {/* Not started */}
        {stage === -1 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#475569' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
            <h3 style={{ color: '#94a3b8', marginBottom: 8, fontSize: 18 }}>
              Query Execution Simulator
            </h3>
            {lastQuery ? (
              <div>
                <p style={{ fontSize: 13, marginBottom: 16 }}>
                  Last query loaded from SQL Editor — ready to simulate!
                </p>
                <div style={{ background: '#0d1117', border: '1px solid #1e293b',
                  borderRadius: 8, padding: 12, maxWidth: 500, margin: '0 auto',
                  textAlign: 'left' }}>
                  <pre style={{ fontSize: 11, color: '#94a3b8', margin: 0,
                    fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {lastQuery.sql}
                  </pre>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
                    {lastQuery.rows} rows · {lastQuery.time}ms
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13 }}>
                Run a query in the SQL Editor tab first,<br/>
                then come back here to simulate it.
              </p>
            )}
          </div>
        )}

        {/* Active stage */}
        {current && analysis && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center',
              gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>{current.icon}</span>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                  Stage {stage + 1}: {current.name}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  {current.desc}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', padding: '4px 12px',
                borderRadius: 20, background: current.color + '20',
                color: current.color, fontSize: 11, fontWeight: 700 }}>
                {playing ? '● RUNNING' : '⏸ PAUSED'}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: '#1e293b', borderRadius: 4,
              marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: current.color,
                borderRadius: 4, width: playing ? '100%' : '30%',
                transition: 'width 2.4s linear' }} />
            </div>

            {/* Stage 0: tokens from REAL sql */}
            {stage === 0 && <TokenDisplay tokens={tokens} />}

            {/* Stage 1: parse tree with REAL tables */}
            {stage === 1 && <ParseTree analysis={analysis} />}

            {/* Stage 2: semantic checks with REAL tables */}
            {stage === 2 && <SemanticChecks analysis={analysis} schema={schema} />}

            {/* Stage 3: optimizations based on REAL query */}
            {stage === 3 && <Optimizations analysis={analysis} />}

            {/* Stages 4-7 */}
            {stage >= 4 && stage <= 7 && (
              <GenericStage stage={stage} analysis={analysis} />
            )}

            {/* Explanation */}
            <div style={{ marginTop: 20, padding: '14px 16px',
              background: '#0d1117', borderRadius: 10,
              border: '1px solid #1e293b', fontSize: 13,
              color: '#94a3b8', lineHeight: 1.7 }}>
              <span style={{ color: current.color, fontWeight: 700 }}>
                📚 What's happening:{' '}
              </span>
              {getStageDetail(stage, analysis)}
            </div>
          </div>
        )}

        {/* Finished — show REAL stats */}
        {stage >= STAGE_TEMPLATES.length && lastQuery && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: '#4ade80', marginBottom: 20 }}>
              Simulation Complete!
            </h2>
            <div style={{ display: 'flex', gap: 14,
              justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                ['Execution Time', `${lastQuery.time}ms`],
                ['Rows Returned',  `${lastQuery.rows}`],
                ['Tables Scanned', `${analysis?.tables?.length || 1}`],
                ['Columns',        `${lastQuery.columns?.length || '?'}`],
                ['Has JOIN',       analysis?.hasJoin  ? 'Yes' : 'No'],
                ['Has Aggregation',analysis?.hasAgg   ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#0d1117',
                  border: '1px solid #1e293b', borderRadius: 10,
                  padding: '12px 18px', textAlign: 'center', minWidth: 110 }}>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{k}</div>
                  <div style={{ fontSize: 18, fontWeight: 700,
                    color: '#4ade80', marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Show actual result preview */}
            {lastQuery.results?.length > 0 && (
              <div style={{ marginTop: 24, textAlign: 'left',
                maxWidth: 600, margin: '24px auto 0' }}>
                <div style={{ fontSize: 11, color: '#64748b',
                  marginBottom: 8, letterSpacing: '0.07em' }}>
                  ACTUAL RESULT PREVIEW (first 5 rows)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse',
                    fontSize: 12 }}>
                    <thead>
                      <tr>
                        {lastQuery.columns?.map(col => (
                          <th key={col} style={{ padding: '6px 12px',
                            textAlign: 'left', color: '#475569',
                            borderBottom: '1px solid #1e293b',
                            fontSize: 10, letterSpacing: '0.07em' }}>
                            {col.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lastQuery.results.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                          {lastQuery.columns?.map(col => (
                            <td key={col} style={{ padding: '6px 12px',
                              color: '#94a3b8' }}>
                              {row[col] === null ? (
                                <span style={{ color: '#334155',
                                  fontStyle: 'italic' }}>NULL</span>
                              ) : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function TokenDisplay({ tokens }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown < tokens.length) {
      const t = setTimeout(() => setShown(s => s + 1), 60);
      return () => clearTimeout(t);
    }
  }, [shown, tokens.length]);

  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
        TOKENS ({shown}/{tokens.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6,
        background: '#0d1117', padding: 16, borderRadius: 10,
        border: '1px solid #1e293b', minHeight: 60 }}>
        {tokens.slice(0, shown).map((tok, i) => (
          <span key={i} style={{ padding: '3px 9px', borderRadius: 5,
            background: tok.color + '20', color: tok.color,
            fontSize: 12, border: `1px solid ${tok.color}40`,
            fontFamily: 'monospace' }}>
            {tok.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function ParseTree({ analysis }) {
  const tables = analysis?.tables || ['unknown'];
  return (
    <div style={{ background: '#0d1117', borderRadius: 10,
      border: '1px solid #1e293b', padding: 16 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        PARSE TREE
      </div>
      <svg width="100%" height={tables.length > 1 ? 200 : 160}>
        {/* Root */}
        <rect x="200" y="10" width="120" height="28" rx="6"
          fill="#6366f125" stroke="#6366f1" strokeWidth="1"/>
        <text x="260" y="28" textAnchor="middle"
          fill="#818cf8" fontSize="11" fontFamily="monospace">
          {analysis?.type}_STMT
        </text>
        {/* SELECT_LIST */}
        <rect x="60" y="70" width="120" height="28" rx="6"
          fill="#8b5cf625" stroke="#8b5cf6" strokeWidth="1"/>
        <text x="120" y="88" textAnchor="middle"
          fill="#a78bfa" fontSize="11" fontFamily="monospace">
          SELECT_LIST
        </text>
        <line x1="260" y1="38" x2="120" y2="70"
          stroke="#334155" strokeWidth="1.5"/>
        {/* FROM */}
        <rect x="220" y="70" width="120" height="28" rx="6"
          fill="#0ea5e925" stroke="#0ea5e9" strokeWidth="1"/>
        <text x="280" y="88" textAnchor="middle"
          fill="#38bdf8" fontSize="11" fontFamily="monospace">
          FROM_CLAUSE
        </text>
        <line x1="260" y1="38" x2="280" y2="70"
          stroke="#334155" strokeWidth="1.5"/>
        {/* WHERE if present */}
        {analysis?.hasWhere && (
          <>
            <rect x="380" y="70" width="100" height="28" rx="6"
              fill="#f59e0b25" stroke="#f59e0b" strokeWidth="1"/>
            <text x="430" y="88" textAnchor="middle"
              fill="#fbbf24" fontSize="11" fontFamily="monospace">WHERE</text>
            <line x1="260" y1="38" x2="430" y2="70"
              stroke="#334155" strokeWidth="1.5"/>
          </>
        )}
        {/* Table nodes */}
        {tables.map((t, i) => (
          <g key={t}>
            <rect x={160 + i * 140} y="130" width="110" height="26" rx="6"
              fill="#10b98125" stroke="#10b981" strokeWidth="1"/>
            <text x={215 + i * 140} y="147" textAnchor="middle"
              fill="#34d399" fontSize="11" fontFamily="monospace">{t}</text>
            <line x1="280" y1="98" x2={215 + i * 140} y2="130"
              stroke="#334155" strokeWidth="1.5"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SemanticChecks({ analysis, schema }) {
  const tables = analysis?.tables || [];
  const checks = [];

  tables.forEach(t => {
    const found = schema && schema[t];
    checks.push({
      name: `Table: ${t}`,
      ok: !!found,
      msg: found
        ? `Found · ${found.columns?.length || 0} columns`
        : 'Not found in schema',
    });
    if (found) {
      const pk = found.columns?.find(c => c.is_primary_key);
      if (pk) checks.push({
        name: `PK: ${t}.${pk.column_name}`,
        ok: true,
        msg: `${pk.data_type} · Primary key verified`,
      });
    }
  });

  if (analysis?.hasJoin) {
    checks.push({ name: 'JOIN condition', ok: true, msg: 'ON clause found and parsed' });
  }
  if (analysis?.hasWhere) {
    checks.push({ name: 'WHERE filter', ok: true, msg: 'Predicate validated' });
  }
  if (analysis?.hasAgg) {
    checks.push({ name: 'Aggregate functions', ok: true, msg: 'COUNT/SUM/AVG compatible with GROUP BY' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checks.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center',
          gap: 12, padding: '10px 16px', background: '#0d1117',
          borderRadius: 8,
          border: `1px solid ${c.ok ? '#052e16' : '#450a0a'}` }}>
          <span style={{ fontSize: 14 }}>{c.ok ? '✓' : '✗'}</span>
          <span style={{ fontSize: 13, color: c.ok ? '#4ade80' : '#f87171',
            fontFamily: 'monospace' }}>{c.name}</span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
            {c.msg}
          </span>
        </div>
      ))}
    </div>
  );
}

function Optimizations({ analysis }) {
  const opts = [];

  if (analysis?.hasWhere) {
    opts.push({
      rule: 'Predicate Pushdown',
      before: 'Filter after JOIN',
      after: 'Filter before JOIN',
      save: 'reduces rows early',
    });
  }
  if (analysis?.hasJoin) {
    opts.push({
      rule: 'Join Reordering',
      before: `${analysis.tables[1]} ⋈ ${analysis.tables[0]}`,
      after: `${analysis.tables[0]} ⋈ ${analysis.tables[1]}`,
      save: 'smaller build-side',
    });
  }
  if (analysis?.hasAgg) {
    opts.push({
      rule: 'Partial Aggregation',
      before: 'Aggregate after full scan',
      after: 'Aggregate per partition',
      save: 'less data to merge',
    });
  }
  if (opts.length === 0) {
    opts.push({
      rule: 'Simple Query',
      before: 'Full table scan',
      after: 'Full table scan (optimal)',
      save: 'no rewrite needed',
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {opts.map((o, i) => (
        <div key={i} style={{ background: '#0d1117', borderRadius: 10,
          border: '1px solid #1e293b', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b',
            marginBottom: 10 }}>⚡ {o.rule}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ padding: '5px 10px', background: '#450a0a',
              borderRadius: 6, fontSize: 11, color: '#f87171',
              fontFamily: 'monospace' }}>{o.before}</span>
            <span style={{ color: '#4ade80', fontSize: 18 }}>→</span>
            <span style={{ padding: '5px 10px', background: '#052e16',
              borderRadius: 6, fontSize: 11, color: '#4ade80',
              fontFamily: 'monospace' }}>{o.after}</span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
              💾 {o.save}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericStage({ stage, analysis }) {
  const tables = analysis?.tables || ['table'];

  const content = {
    4: [
      analysis?.hasLimit  && ['LIMIT',          '#6366f1'],
      analysis?.hasOrder  && ['SORT',            '#8b5cf6'],
      analysis?.hasAgg    && ['HASH AGGREGATE',  '#0ea5e9'],
      analysis?.hasGroup  && ['GROUP BY',        '#10b981'],
      analysis?.hasJoin   && ['HASH JOIN',       '#f59e0b'],
      analysis?.hasWhere  && ['FILTER',          '#ef4444'],
      ...tables.map(t  => [`SCAN ${t}`,          '#94a3b8']),
    ].filter(Boolean),

    5: [
      analysis?.hasJoin   && ['HashJoin (memory fit)',    '#f59e0b'],
      analysis?.hasAgg    && ['HashAggregate',            '#0ea5e9'],
      analysis?.hasWhere  && ['Filter pushdown applied',  '#4ade80'],
      ...tables.map(t  => [`SeqScan: ${t}`,               '#94a3b8']),
    ].filter(Boolean),

    6: [
      ...tables.map(t  => [`${t}: rows flowing...`]),
      analysis?.hasWhere  && ['Filter: reducing rows'],
      analysis?.hasJoin   && ['JOIN: matching keys'],
      analysis?.hasAgg    && ['Aggregate: grouping results'],
      analysis?.hasOrder  && ['Sort: ordering output'],
    ].filter(Boolean),

    7: [
      ['Query completed successfully'],
      [`Rows returned: ${analysis?.rows ?? '?'}`],
      [`Tables accessed: ${tables.join(', ')}`],
      analysis?.hasJoin  && ['Join strategy: HashJoin'],
      analysis?.hasAgg   && ['Aggregation: Hash method'],
    ].filter(Boolean),
  }[stage] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {content.map(([text, color = '#94a3b8'], i) => (
        <div key={i} style={{ padding: '10px 16px', background: '#0d1117',
          border: `1px solid ${color}40`, borderRadius: 8,
          fontSize: 13, color, fontFamily: 'monospace' }}>
          {stage === 4 ? `▸ ${text}` : `✓ ${text}`}
        </div>
      ))}
    </div>
  );
}

function getStageDetail(stage, analysis) {
  const tables = analysis?.tables?.join(', ') || 'the table';
  const details = [
    `The tokenizer scans your SQL left-to-right and groups characters into tokens. Keywords like SELECT and FROM are highlighted differently from table names like ${tables}.`,
    `The parser checks that your tokens follow SQL grammar rules and builds a tree. Each clause (SELECT, FROM${analysis?.hasWhere ? ', WHERE' : ''}) becomes a branch with children.`,
    `Table names and column names are checked against the actual database schema. ${analysis?.tables?.length > 1 ? 'The join relationship between tables is also verified.' : ''}`,
    `The optimizer rewrites the query plan to run faster. ${analysis?.hasWhere ? 'Filters are pushed closer to the table scan to reduce rows early. ' : ''}${analysis?.hasJoin ? 'Join order is evaluated to minimize intermediate data.' : ''}`,
    `The optimized query becomes a tree of abstract operators: ${[analysis?.hasWhere && 'Filter', analysis?.hasJoin && 'Join', analysis?.hasAgg && 'Aggregate', analysis?.hasOrder && 'Sort', 'Scan'].filter(Boolean).join(' → ')}.`,
    `Each logical operator is mapped to a real algorithm. ${analysis?.hasJoin ? 'JOIN uses HashJoin since the data fits in memory. ' : ''}Table scans use Sequential Scan.`,
    `Data flows bottom-up through the pipeline. The table scan${analysis?.tables?.length > 1 ? 's' : ''} produce rows, each operator transforms them, and the final result bubbles up.`,
    `Results are collected and returned to the client. All statistics are recorded: execution time, rows scanned, memory usage.`,
  ];
  return details[stage] || '';
}