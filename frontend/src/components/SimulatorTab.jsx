// frontend/src/components/SimulatorTab.jsx
// Real query execution simulator with EXPLAIN ANALYZE, join comparison, index analysis,
// and join algorithm comparison (Nested Loop / Hash Join / Merge Sort Join).
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store.jsx';
import { simulateQuery } from '../api.js';
import toast from 'react-hot-toast';

// ── tiny bar helper ────────────────────────────────────────────────
function Bar({ value, max, color = '#6366f1', label, sub }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#94a3b8' }}>
          <span>{label}</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{sub}</span>
        </div>
      )}
      <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Access type badge ──────────────────────────────────────────────
const ACCESS_COLORS = {
  // MySQL access types
  'ALL':              { bg: '#7f1d1d', text: '#fca5a5', label: 'FULL SCAN worst' },
  'index':            { bg: '#78350f', text: '#fcd34d', label: 'INDEX SCAN' },
  'range':            { bg: '#14532d', text: '#86efac', label: 'RANGE SCAN' },
  'ref':              { bg: '#1e3a5f', text: '#93c5fd', label: 'REF LOOKUP' },
  'eq_ref':           { bg: '#1e3a5f', text: '#67e8f9', label: 'UNIQUE LOOKUP' },
  'const':            { bg: '#1a2e1a', text: '#4ade80', label: 'CONST best' },
  'system':           { bg: '#1a2e1a', text: '#4ade80', label: 'SYSTEM best' },
  // PostgreSQL node/scan types
  'Seq Scan':         { bg: '#7f1d1d', text: '#fca5a5', label: 'FULL SCAN worst' },
  'Index Scan':       { bg: '#1e3a5f', text: '#93c5fd', label: 'INDEX SCAN' },
  'Index Only Scan':  { bg: '#14532d', text: '#4ade80', label: 'INDEX ONLY best' },
  'Bitmap Heap Scan': { bg: '#1e3a5f', text: '#67e8f9', label: 'BITMAP SCAN' },
  'Bitmap Index Scan':{ bg: '#1e3a5f', text: '#67e8f9', label: 'BITMAP INDEX' },
  'Hash':             { bg: '#164e63', text: '#38bdf8', label: 'HASH' },
  'Hash Join':        { bg: '#164e63', text: '#38bdf8', label: 'HASH JOIN' },
  'Nested Loop':      { bg: '#3b0764', text: '#a78bfa', label: 'NESTED LOOP' },
  'Merge Join':       { bg: '#2e1065', text: '#c4b5fd', label: 'MERGE JOIN' },
  'Sort':             { bg: '#78350f', text: '#fcd34d', label: 'SORT' },
  'Aggregate':        { bg: '#1e293b', text: '#94a3b8', label: 'AGGREGATE' },
  'Unknown':          { bg: '#1e293b', text: '#64748b', label: 'UNKNOWN' },
  'Error':            { bg: '#7f1d1d', text: '#fca5a5', label: 'ERROR' },
};

function AccessBadge({ type }) {
  const cfg = ACCESS_COLORS[type] || { bg: '#1e293b', text: '#94a3b8', label: type };
  return (
    <span style={{ background: cfg.bg, color: cfg.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
      {type || '?'} <span style={{ fontWeight: 400, opacity: 0.8 }}>{cfg.label}</span>
    </span>
  );
}

const SEV_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

// ── PG tree node recursive render ──────────────────────────────────
function PlanNode({ node, depth }) {
  depth = depth || 0;
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;

  const isBottleneck = (node.actualTotalTime || 0) > 50;
  const bg = isBottleneck ? '#2d1010' : '#111827';
  const border = isBottleneck ? '1px solid #7f1d1d' : '1px solid #1e293b';

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ background: bg, border, borderRadius: 8, padding: '10px 14px', marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{'—'.repeat(depth)}</span>
          <span style={{ color: '#818cf8', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{node.nodeType}</span>
          {node.relation && <span style={{ color: '#38bdf8', fontSize: 12 }}>📋 {node.relation}{node.alias ? ` (${node.alias})` : ''}</span>}
          {node.indexName && <span style={{ color: '#4ade80', fontSize: 12 }}>🔑 {node.indexName}</span>}
          {node.joinType && <span style={{ color: '#f59e0b', fontSize: 12 }}>⊕ {node.joinType}</span>}
          {isBottleneck && <span style={{ color: '#ef4444', fontSize: 11 }}>🔥 BOTTLENECK</span>}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 6, flexWrap: 'wrap' }}>
          {node.actualTotalTime != null && <span style={{ fontSize: 11, color: '#94a3b8' }}>⏱ <b style={{ color: '#e2e8f0' }}>{node.actualTotalTime.toFixed(3)}ms</b></span>}
          {node.actualRows != null && <span style={{ fontSize: 11, color: '#94a3b8' }}>rows: <b style={{ color: '#e2e8f0' }}>{node.actualRows.toLocaleString()}</b></span>}
          {node.totalCost != null && <span style={{ fontSize: 11, color: '#94a3b8' }}>cost: <b style={{ color: '#e2e8f0' }}>{node.totalCost.toFixed(1)}</b></span>}
          {node.filter && <span style={{ fontSize: 11, color: '#64748b' }}>filter: <code style={{ color: '#f59e0b' }}>{node.filter}</code></span>}
        </div>
      </div>
      {open && (node.children || []).map((child, i) => <PlanNode key={i} node={child} depth={depth + 1} />)}
    </div>
  );
}

// ── Join Algorithm Card ────────────────────────────────────────────
const ALGO_COLORS = {
  nested_loop: { accent: '#f59e0b', dim: '#78350f', icon: '🔄' },
  hash:        { accent: '#38bdf8', dim: '#164e63', icon: '#' },
  merge:       { accent: '#a78bfa', dim: '#3b0764', icon: '⇅' },
};

function AlgoCard({ algo, isFastest, maxTime }) {
  const [open, setOpen] = useState(false);
  const col = ALGO_COLORS[algo.id] || { accent: '#64748b', dim: '#1e293b', icon: '?' };
  const pct = maxTime > 0 && algo.timeMs != null ? Math.min((algo.timeMs / maxTime) * 100, 100) : 0;
  const c   = algo.characteristics || {};

  return (
    <div style={{
      background: '#111827',
      border: `1px solid ${isFastest ? col.accent + '60' : '#1e293b'}`,
      borderLeft: `3px solid ${col.accent}`,
      borderRadius: 10,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, color: col.accent, fontFamily: 'monospace', minWidth: 24 }}>{col.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{algo.name}</span>
              {isFastest && (
                <span style={{ background: '#0f2520', color: '#4ade80', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, border: '1px solid #14532d' }}>
                  FASTEST 🏆
                </span>
              )}
              {!algo.supported && (
                <span style={{ background: '#1e293b', color: '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 10 }}>
                  {algo.id === 'nested_loop' ? 'ONLY SUPPORTED (SQLite)' : 'NOT SUPPORTED (SQLite)'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{algo.explanation || c.bestCase}</div>
          </div>

          <div style={{ textAlign: 'right', minWidth: 80 }}>
            {algo.timeMs != null ? (
              <div style={{ fontSize: 22, fontWeight: 700, color: isFastest ? '#4ade80' : col.accent }}>
                {algo.timeMs.toFixed(2)}<span style={{ fontSize: 12, color: '#64748b', marginLeft: 2 }}>ms</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>N/A</div>
            )}
            {algo.planNodeType && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{algo.planNodeType}</div>
            )}
          </div>
        </div>

        {algo.timeMs != null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: isFastest ? '#4ade80' : col.accent, borderRadius: 2, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
          {open ? '▲ Hide details' : '▼ Show characteristics'}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #1e293b' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Time complexity', val: c.timeComplexity },
              { label: 'Space complexity', val: c.spaceComplexity },
              { label: 'Best case', val: c.bestCase },
              { label: 'Worst case', val: c.worstCase },
            ].map(item => (
              <div key={item.label} style={{ background: '#0d1117', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>{item.val || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Requires sort', val: c.requiresSort },
              { label: 'Requires memory', val: c.requiresMemory },
              { label: 'Range joins', val: c.supportsRange },
              { label: 'Parallelizable', val: c.parallelizable },
            ].map(item => (
              <span key={item.label} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 10,
                background: item.val ? '#0f2520' : '#1e293b',
                color: item.val ? '#4ade80' : '#64748b',
                border: `1px solid ${item.val ? '#14532d' : '#374151'}`,
              }}>
                {item.val ? '✓' : '✗'} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE PIPELINE STEPS ───────────────────────────────────────────
const STAGES = [
  { id: 'parse',    icon: '🔤', label: 'Parse Query',           desc: 'Tokenise and validate SQL syntax' },
  { id: 'plan',     icon: '🧠', label: 'Build Execution Plan',   desc: 'Optimizer chooses access paths and algorithms' },
  { id: 'execute',  icon: '⚙️', label: 'Execute',               desc: 'Run against real data — EXPLAIN ANALYZE' },
  { id: 'index',    icon: '🔑', label: 'Index Analysis',         desc: 'Compare with and without indexes' },
  { id: 'joins',    icon: '🔗', label: 'Join Comparison',        desc: 'Test every join type with real timing' },
  { id: 'algos',    icon: '⚡', label: 'Algorithm Comparison',   desc: 'Nested Loop vs Hash Join vs Merge Sort' },
  { id: 'tips',     icon: '💡', label: 'Performance Tips',       desc: 'Surface optimisation hints from the plan' },
];

// ── SAMPLE QUERIES ─────────────────────────────────────────────────
const SAMPLES = [
  {
    label: 'Simple SELECT',
    sql: `SELECT * FROM customers WHERE city = 'New York' ORDER BY name LIMIT 50;`,
  },
  {
    label: 'JOIN Query',
    sql: `SELECT o.id, c.name, o.total\nFROM orders o\nINNER JOIN customers c ON o.customer_id = c.id\nWHERE o.total > 100\nORDER BY o.total DESC;`,
  },
  {
    label: 'Complex Aggregate',
    sql: `SELECT c.name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id\nGROUP BY c.name\nHAVING COUNT(o.id) > 3\nORDER BY total_spent DESC;`,
  },
];

// ── MAIN COMPONENT ─────────────────────────────────────────────────
export default function SimulatorTab() {
  const { lastQuery } = useApp();
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [stageIndex, setStageIndex] = useState(-1);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  // BUG FIX #5: track abort controller for fetch cancellation
  const abortRef = useRef(null);

  useEffect(() => {
    if (lastQuery && lastQuery.sql) setSql(lastQuery.sql);
  }, [lastQuery]);

  // BUG FIX #5: cancel fetch on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!animating) return;
    if (stageIndex >= STAGES.length - 1) { setAnimating(false); return; }
    timerRef.current = setTimeout(function () {
      setStageIndex(function (i) { return i + 1; });
    }, 500);
    return function () { clearTimeout(timerRef.current); };
  }, [animating, stageIndex]);

  function handleAnalyze() {
    if (!sql.trim()) { toast.error('Enter a SQL query first'); return; }

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTab('pipeline');
    setStageIndex(0);
    setAnimating(true);

    // BUG FIX #7: use 120s timeout for the simulator (many DB round-trips)
    simulateQuery(sql)
      .then(function (data) {
        if (!data.success) throw new Error(data.error);
        setTimeout(function () {
          setResult(data);
          setStageIndex(STAGES.length - 1);
          setAnimating(false);
          setLoading(false);
        }, STAGES.length * 500 + 200);
      })
      .catch(function (err) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        setError(err.message || 'Analysis failed');
        setAnimating(false);
        setLoading(false);
      });
  }

  var tabs = [
    { id: 'pipeline', label: '⚡ Pipeline' },
    { id: 'plan',     label: '🌳 Exec Plan' },
    { id: 'index',    label: '🔑 Index Impact' },
    { id: 'joins',    label: '🔗 Join Types' },
    { id: 'algos',    label: '🧮 Algorithms' },
    { id: 'tips',     label: '💡 Tips' },
  ];

  var ic         = result && result.indexComparison;
  var jc         = result && result.joinComparison;
  var jac        = result && result.joinAlgorithmComparison;
  var tips       = (result && result.performanceTips) || [];
  var stats      = (result && result.statistics) || {};
  var pgPlan     = result && result.executionPlan && result.executionPlan.rootNode;
  var myPlan     = (result && result.executionPlan && result.executionPlan.traditionalRows) || [];
  var treeOutput = (result && result.executionPlan && result.executionPlan.treeOutput) || '';

  // BUG FIX #8: maxJoinTime should be max of actual values, not hardcoded 1
  var maxJoinTime = Math.max(1, ...(jc?.comparisons?.map(c => c.timeMs || 0) ?? [1]));

  // Max for algo comparison bars
  var maxAlgoTime = Math.max(
    0.001,
    ...(jac?.comparisons?.filter(c => c.timeMs != null).map(c => c.timeMs) ?? [0.001])
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', background: '#07090f', fontFamily: 'system-ui, sans-serif' }}>

      {/* LEFT PANEL */}
      <div style={{ width: 360, background: '#0a0c14', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Query Simulator
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>Real execution · EXPLAIN ANALYZE · Live timing</div>
        </div>

        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>SQL QUERY</div>
          <textarea
            value={sql}
            onChange={function (e) { setSql(e.target.value); }}
            rows={10}
            placeholder="SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.total > 100;"
            style={{
              flex: 1, width: '100%', background: '#0d1117', border: '1px solid #1e293b',
              borderRadius: 8, color: '#e2e8f0', padding: 14,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 12, lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box',
            }}
          />

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>SAMPLE QUERIES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SAMPLES.map(function (s, i) {
                return (
                  <button key={i} onClick={function () { setSql(s.sql); }} style={{
                    textAlign: 'left', padding: '6px 10px', background: '#111827',
                    border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8',
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !sql.trim()}
            style={{
              marginTop: 14, padding: '13px 0', background: loading ? '#312e81' : '#4f46e5',
              color: 'white', border: 'none', borderRadius: 8, fontWeight: 700,
              fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Analyzing...' : '▶ Run Real Analysis'}
          </button>

          {result && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Exec Time', value: (result.executionTimeMs||0).toFixed(1) + 'ms', color: result.executionTimeMs > 500 ? '#ef4444' : '#4ade80' },
                { label: 'Plan Time', value: (result.planningTimeMs||0).toFixed(1) + 'ms', color: '#94a3b8' },
                { label: 'Rows', value: (result.rowsReturned||0).toLocaleString(), color: '#38bdf8' },
                { label: 'Tables', value: (stats.tablesAccessed||[]).length, color: '#a78bfa' },
                { label: 'JOINs', value: stats.joinCount || 0, color: '#f59e0b' },
                { label: 'Tips', value: tips.length, color: tips.some(function (t) { return t.severity === 'critical'; }) ? '#ef4444' : '#4ade80' },
              ].map(function (s) {
                return (
                  <div key={s.label} style={{ background: '#111827', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0a0c14', padding: '0 20px', gap: 4, overflowX: 'auto' }}>
          {tabs.map(function (t) {
            return (
              <button key={t.id} onClick={function () { setActiveTab(t.id); }} style={{
                padding: '12px 14px', background: 'none', border: 'none', whiteSpace: 'nowrap',
                color: activeTab === t.id ? '#818cf8' : '#64748b',
                borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                fontWeight: activeTab === t.id ? 700 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1,
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ margin: 20, padding: '12px 16px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── PIPELINE TAB ── */}
          {activeTab === 'pipeline' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 6 }}>Execution Pipeline</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Each stage shows what the database engine actually does when you run a query.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {STAGES.map(function (s, i) {
                  var done    = stageIndex >= i;
                  var active  = stageIndex === i && animating;
                  var pending = stageIndex < i;
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, opacity: pending ? 0.35 : 1, transition: 'opacity 0.4s' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? '#312e81' : '#111827',
                        border: active ? '2px solid #818cf8' : done ? '2px solid #4f46e5' : '2px solid #1e293b',
                        fontSize: 16, boxShadow: active ? '0 0 12px #6366f180' : 'none', transition: 'all 0.3s',
                      }}>
                        {done && !active ? '✓' : s.icon}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ fontWeight: 600, color: done ? '#e2e8f0' : '#64748b', fontSize: 14 }}>{s.label}</div>
                        <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>{s.desc}</div>
                        {s.id === 'execute' && result && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#4ade80', background: '#14532d', padding: '2px 8px', borderRadius: 4 }}>
                              ⏱ {(result.executionTimeMs||0).toFixed(2)}ms execution
                            </span>
                            {result.planningTimeMs > 0 && (
                              <span style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>
                                📐 {result.planningTimeMs.toFixed(2)}ms planning
                              </span>
                            )}
                          </div>
                        )}
                        {s.id === 'algos' && jac && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: '#a78bfa', background: '#1e1a3d', padding: '2px 8px', borderRadius: 4 }}>
                              Fastest: {jac.fastestName || '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {result && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '4px 10px', borderRadius: 6 }}>
                      Engine detected: <b style={{ color: '#818cf8' }}>{result.engine || 'unknown'}</b>
                    </span>
                  </div>
                  <div style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Query Statistics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {[
                        { label: 'Tables', val: (stats.tablesAccessed||[]).join(', ') || '—' },
                        { label: 'JOINs', val: stats.joinCount || 0 },
                        { label: 'Aggregations', val: stats.aggregations || 0 },
                        { label: 'Filters', val: stats.filterCount || 0 },
                        { label: 'Sort ops', val: stats.sortOps || 0 },
                        { label: 'Subqueries', val: stats.subqueries || 0 },
                      ].map(function (r) {
                        return (
                          <div key={r.label} style={{ background: '#0d1117', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{r.label}</div>
                            <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginTop: 2, wordBreak: 'break-word' }}>{r.val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!result && !loading && stageIndex === -1 && (
                <div style={{ textAlign: 'center', paddingTop: 60, color: '#475569' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>Run a query to see real execution data</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Powered by EXPLAIN ANALYZE — actual timings from your database</div>
                </div>
              )}
            </div>
          )}

          {/* ── EXEC PLAN TAB ── */}
          {activeTab === 'plan' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Execution Plan</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Exact operations performed by the database engine.</p>

              {!result && <div style={{ color: '#475569', textAlign: 'center', paddingTop: 60 }}>Run a query first.</div>}

              {pgPlan && (
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, display: 'flex', gap: 16 }}>
                    <span>Planning: <b style={{ color: '#e2e8f0' }}>{(result.planningTimeMs||0).toFixed(2)}ms</b></span>
                    <span>Execution: <b style={{ color: '#4ade80' }}>{(result.executionTimeMs||0).toFixed(2)}ms</b></span>
                  </div>
                  <PlanNode node={pgPlan} depth={0} />
                </div>
              )}

              {myPlan.length > 0 && result.engine === 'mysql' && (
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    Execution time: <b style={{ color: '#4ade80' }}>{(result.executionTimeMs||0).toFixed(2)}ms</b>
                    {result.executionPlan && result.executionPlan.estimatedCost ? (
                      <span style={{ marginLeft: 12 }}>Estimated cost: <b style={{ color: '#e2e8f0' }}>{result.executionPlan.estimatedCost}</b></span>
                    ) : null}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#1e293b' }}>
                          {['#', 'Type', 'Table', 'Access', 'Key Used', 'Rows Est.', 'Filtered', 'Extra'].map(function (h) {
                            return <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>{h}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {myPlan.map(function (row, i) {
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? '#0d1117' : '#111827' }}>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.id}</td>
                              <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{row.selectType}</td>
                              <td style={{ padding: '8px 12px', color: '#38bdf8', fontWeight: 600 }}>{row.table}</td>
                              <td style={{ padding: '8px 12px' }}><AccessBadge type={row.type} /></td>
                              <td style={{ padding: '8px 12px', color: '#4ade80', fontFamily: 'monospace' }}>{row.key || '—'}</td>
                              <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{(row.rows||0).toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', color: parseFloat(row.filtered) < 50 ? '#f59e0b' : '#4ade80' }}>{row.filtered}%</td>
                              <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.extra || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {treeOutput && result.engine === 'mysql' && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>EXPLAIN ANALYZE — Tree (actual timing)</div>
                  <pre style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, padding: 16, fontSize: 11, color: '#94a3b8', overflowX: 'auto', lineHeight: 1.8 }}>
                    {treeOutput}
                  </pre>
                </div>
              )}

              {result && !pgPlan && myPlan.length === 0 && (
                <div style={{ background: '#111827', borderRadius: 8, padding: 16 }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{(result.executionPlan && result.executionPlan.note) || 'Plan data not available for this engine.'}</div>
                  <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 700 }}>{(result.executionTimeMs||0).toFixed(2)}ms</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>measured execution time</div>
                </div>
              )}
            </div>
          )}

          {/* ── INDEX IMPACT TAB ── */}
          {activeTab === 'index' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Index Impact Analysis</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Real query execution compared with and without indexes.</p>

              {!ic && <div style={{ color: '#475569', textAlign: 'center', paddingTop: 60 }}>Run a query first. Requires PostgreSQL or MySQL.</div>}

              {ic && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#0f2520', border: '1px solid #14532d', borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 12 }}>WITH INDEXES</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>{(ic.withIndex.timeMs || 0).toFixed(2)}ms</div>
                      <div style={{ fontSize: 12, color: '#86efac' }}>Scan: {ic.withIndex.scanType}</div>
                      {ic.withIndex.keyUsed && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Key: {ic.withIndex.keyUsed}</div>}
                    </div>
                    <div style={{ background: '#200f0f', border: '1px solid #7f1d1d', borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 12 }}>WITHOUT INDEXES</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>{(ic.withoutIndex.timeMs || 0).toFixed(2)}ms</div>
                      <div style={{ fontSize: 12, color: '#fca5a5' }}>Scan: {ic.withoutIndex.scanType}</div>
                    </div>
                  </div>

                  {(function () {
                    var mx = Math.max(ic.withIndex.timeMs || 0, ic.withoutIndex.timeMs || 0, 0.01);
                    var pct = ic.improvement.timeReductionPercent || 0;
                    return (
                      <div style={{ background: '#111827', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Execution Time Comparison</div>
                        <Bar value={ic.withIndex.timeMs || 0}    max={mx} color="#4ade80" label="With Indexes"    sub={(ic.withIndex.timeMs||0).toFixed(2) + 'ms'} />
                        <Bar value={ic.withoutIndex.timeMs || 0} max={mx} color="#f87171" label="Without Indexes" sub={(ic.withoutIndex.timeMs||0).toFixed(2) + 'ms'} />
                        {ic.improvement.timeReductionMs > 0 ? (
                          <div style={{ marginTop: 16, padding: '10px 14px', background: '#0f2520', borderRadius: 8, fontSize: 13, color: '#4ade80' }}>
                            ✅ Indexes are <b>{pct.toFixed(1)}%</b> faster — saving <b>{ic.improvement.timeReductionMs.toFixed(2)}ms</b> per query
                          </div>
                        ) : ic.indexesAppearedSlower ? (
                          <div style={{ marginTop: 16, padding: '12px 14px', background: '#2d1a0a', border: '1px solid #92400e', borderRadius: 8, fontSize: 13, color: '#fcd34d' }}>
                            ⚠️ <b>Indexes appear slower</b> — this is usually caused by a <b>function wrapping the column</b> (e.g. <code style={{fontFamily:'monospace',color:'#fb923c'}}>DATE(col)</code>, <code style={{fontFamily:'monospace',color:'#fb923c'}}>YEAR(col)</code>). MySQL cannot use an index when a function is applied to the indexed column. Consider a <b>generated column</b> or rewrite the predicate without the function.
                          </div>
                        ) : (
                          <div style={{ marginTop: 16, padding: '10px 14px', background: '#1e293b', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
                            ℹ️ No significant difference — the query may not benefit from indexes at this data size, or all scan paths are equivalent.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {ic.improvement.scanChange && (
                    <div style={{ background: '#111827', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>SCAN TYPE CHANGE</div>
                      <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                        {(function() {
                          // Split on any arrow variant (Unicode → or ASCII ->)
                          var parts = ic.improvement.scanChange.split(/\s*[→\->]+\s*/);
                          var from = (parts[0] || '').trim();
                          var to   = (parts[1] || '').trim();
                          return (
                            <>
                              <span style={{ color: '#f87171' }}>{from || '—'}</span>
                              <span style={{ color: '#64748b', margin: '0 12px' }}>→</span>
                              <span style={{ color: '#4ade80' }}>{to || '—'}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── JOIN TYPES TAB ── */}
          {activeTab === 'joins' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Join Type Comparison</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Same query re-run with different JOIN types — real execution times from your database.</p>

              {!jc && (
                <div style={{ color: '#475569', textAlign: 'center', paddingTop: 60 }}>
                  {result ? 'Your query has no JOIN — add a JOIN clause to see this comparison.' : 'Run a query with a JOIN first.'}
                </div>
              )}

              {jc && (
                <div>
                  {jc.bestJoinType && (
                    <div style={{ marginBottom: 20, padding: '10px 16px', background: '#1e1a3d', border: '1px solid #4f46e5', borderRadius: 8, fontSize: 13, color: '#a5b4fc' }}>
                      Fastest: <b style={{ color: '#818cf8' }}>{jc.bestJoinType}</b>
                    </div>
                  )}

                  <div style={{ background: '#111827', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Execution Time by Join Type</div>
                    {jc.comparisons.map(function (c, i) {
                      var colors = ['#818cf8','#38bdf8','#4ade80','#f59e0b','#f87171'];
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <Bar
                            value={c.timeMs || 0}
                            max={maxJoinTime}
                            color={c.joinType === jc.bestJoinType ? '#4ade80' : colors[i % colors.length]}
                            label={c.joinType + (c.joinType === jc.bestJoinType ? ' 🏆' : '')}
                            sub={c.success ? (c.timeMs||0).toFixed(2) + 'ms · ' + (c.rowCount||0).toLocaleString() + ' rows' : c.error || 'Error'}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#1e293b' }}>
                          {['Join Type', 'Time (ms)', 'Rows Returned', 'Scan Type'].map(function (h) {
                            return <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8' }}>{h}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {jc.comparisons.map(function (c, i) {
                          return (
                            <tr key={i} style={{
                              borderBottom: '1px solid #1e293b',
                              background: c.joinType === jc.bestJoinType ? '#0f2520' : i % 2 === 0 ? '#0d1117' : '#111827',
                            }}>
                              <td style={{ padding: '10px 14px', color: c.joinType === jc.bestJoinType ? '#4ade80' : '#e2e8f0', fontWeight: c.joinType === jc.bestJoinType ? 700 : 400 }}>
                                {c.joinType} {c.joinType === jc.bestJoinType ? '🏆' : ''}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                {c.success ? (c.timeMs||0).toFixed(2) : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                                {c.success ? (c.rowCount||0).toLocaleString() : '—'}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {c.success ? <AccessBadge type={c.scanType} /> : <span style={{ color: '#f87171', fontSize: 11 }}>{c.error}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 16, padding: '10px 14px', background: '#0d1117', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
                    Row counts differ by design — LEFT/RIGHT JOINs keep unmatched rows as NULLs, CROSS JOIN is the cartesian product. Choose join type for correctness first, then performance.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── JOIN ALGORITHMS TAB (NEW) ── */}
          {activeTab === 'algos' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Join Algorithm Comparison</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                The database is forced to use each algorithm via optimizer hints/settings.
                Real EXPLAIN ANALYZE timing — not simulated.
              </p>

              {!jac && (
                <div style={{ color: '#475569', textAlign: 'center', paddingTop: 60 }}>
                  {result
                    ? 'Your query has no JOIN — add a JOIN clause to compare algorithms.'
                    : 'Run a query with a JOIN first.'}
                </div>
              )}

              {jac && (
                <div>
                  {/* Best algorithm banner */}
                  {jac.fastestName && (
                    <div style={{ marginBottom: 20, padding: '12px 18px', background: '#0f1b14', border: '1px solid #1f4031', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>🏆</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Fastest for this query: {jac.fastestName}</div>
                        {jac.recommendation && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{jac.recommendation}</div>}
                      </div>
                    </div>
                  )}

                  {/* Time bars summary */}
                  <div style={{ background: '#111827', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Measured Execution Time</div>
                    {jac.comparisons.map(function (algo) {
                      const col = ALGO_COLORS[algo.id] || { accent: '#64748b' };
                      const isFastest = algo.id === jac.fastestAlgo;
                      return (
                        <div key={algo.id} style={{ marginBottom: 12 }}>
                          <Bar
                            value={algo.timeMs || 0}
                            max={maxAlgoTime}
                            color={isFastest ? '#4ade80' : col.accent}
                            label={algo.shortName + (isFastest ? ' 🏆' : '') + (!algo.supported ? ' (not supported)' : '')}
                            sub={algo.timeMs != null ? (algo.timeMs).toFixed(2) + 'ms' + (algo.rowCount ? ' · ' + algo.rowCount.toLocaleString() + ' rows' : '') : 'N/A'}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Algo cards */}
                  <div style={{ marginBottom: 20 }}>
                    {jac.comparisons.map(function (algo) {
                      return (
                        <AlgoCard
                          key={algo.id}
                          algo={algo}
                          isFastest={algo.id === jac.fastestAlgo}
                          maxTime={maxAlgoTime}
                        />
                      );
                    })}
                  </div>

                  {/* Algorithm guide */}
                  <div style={{ background: '#0d1117', borderRadius: 10, padding: 18, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      When to use each algorithm
                    </div>
                    {[
                      { icon: '🔄', name: 'Nested Loop', color: '#f59e0b', desc: 'Best when the inner table is small and has an index on the join column. The DB can seek directly to matching rows without scanning.' },
                      { icon: '#', name: 'Hash Join', color: '#38bdf8', desc: 'Best for large equality joins where neither table is indexed on the join column. Builds a hash table from the smaller side, then probes it. Needs memory.' },
                      { icon: '⇅', name: 'Merge Sort', color: '#a78bfa', desc: 'Best when both join columns are already sorted (via index). Merges in a single linear pass after sorting — avoids random I/O. Works for range predicates too.' },
                    ].map(function (item) {
                      return (
                        <div key={item.name} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                          <span style={{ color: item.color, fontSize: 16, minWidth: 20, fontFamily: 'monospace' }}>{item.icon}</span>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.name} </span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TIPS TAB ── */}
          {activeTab === 'tips' && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Performance Tips</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Issues detected from actual execution data.</p>

              {!result && <div style={{ color: '#475569', textAlign: 'center', paddingTop: 60 }}>Run a query first.</div>}

              {result && tips.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4ade80' }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>No issues detected</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Query looks well-optimized for this data size</div>
                </div>
              )}

              {tips.map(function (tip, i) {
                return (
                  <div key={i} style={{
                    background: '#111827', borderRadius: 8, padding: 16, marginBottom: 12,
                    border: '1px solid ' + (SEV_COLORS[tip.severity] || '#1e293b') + '40',
                    borderLeft: '3px solid ' + (SEV_COLORS[tip.severity] || '#1e293b'),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLORS[tip.severity], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: SEV_COLORS[tip.severity], textTransform: 'uppercase', letterSpacing: 0.5 }}>{tip.category}</span>
                      <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>· {tip.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8 }}>{tip.message}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {tip.suggestion && tip.suggestion.includes('CREATE') ? (
                        <pre style={{ marginTop: 6, background: '#0d1117', padding: 10, borderRadius: 6, fontSize: 11, color: '#a78bfa', overflowX: 'auto' }}>
                          {tip.suggestion}
                        </pre>
                      ) : (
                        <span>💡 {tip.suggestion}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}