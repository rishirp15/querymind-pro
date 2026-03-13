// frontend/src/components/EditorTab.jsx
import { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { executeSQL, explainQuery, optimizeQuery } from '../api.js';
import { useApp } from '../store.jsx';

// ── CSV export helper ─────────────────────────────────────────────
function downloadCSV(columns, rows, filename = 'query_results.csv') {
  const header = columns.join(',');
  const body   = rows.map(row =>
    columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Check if column has numeric data ─────────────────────────────
function getNumericColumns(columns, rows) {
  return columns.filter(col =>
    rows.length > 0 && rows.every(row => {
      const v = row[col];
      return v !== null && v !== undefined && !isNaN(Number(v));
    })
  );
}

// ── Single tab content ────────────────────────────────────────────
function QueryTab({ tab }) {
  const { schema, dialect, feedback, setLastQuery, addToHistory } = useApp();
  const [loading,    setLoading]    = useState(false);
  const [view,       setView]       = useState('table'); // 'table' | 'chart'
  const [chartType,  setChartType]  = useState('bar');
  const [confirm,    setConfirm]    = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explainData,setExplainData]= useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const { updateTab } = useApp();

  const sql_val   = tab.sql;
  const results   = tab.results;
  const isDangerous = /^\s*(DELETE|DROP|TRUNCATE)/i.test(sql_val.trim());
  const numericCols = results
    ? getNumericColumns(results.columns || [], results.rows || []) : [];

  const setSql = useCallback((val) => {
    updateTab(tab.id, { sql: val });
  }, [tab.id, updateTab]);

  async function runQuery(forceSql) {
    const q = forceSql || sql_val;
    if (isDangerous && !confirm) { setConfirm(true); return; }
    setConfirm(false);
    setLoading(true);
    setExplainData(null);
    setOptimizeResult(null);
    try {
      const data = await executeSQL(q);
      updateTab(tab.id, { results: data });
      setLastQuery({
        sql:     q.trim(),
        time:    data.time,
        rows:    data.rowCount,
        columns: data.columns,
        results: data.rows?.slice(0, 5),
      });
      addToHistory({
        sql:    q.trim().replace(/\s+/g, ' '),
        time:   data.time + 'ms',
        rows:   data.rowCount,
        status: 'success',
      });
      toast.success(`${data.rowCount} rows · ${data.time}ms`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Query failed');
      addToHistory({ sql: q.trim(), time: '—', rows: 0, status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function runExplain() {
    setExplaining(true);
    try {
      const data = await explainQuery(sql_val);
      setExplainData(data);
    } catch (err) {
      toast.error('EXPLAIN failed');
    } finally {
      setExplaining(false);
    }
  }

  async function runOptimize() {
    setOptimizing(true);
    try {
      const data = await optimizeQuery(sql_val, dialect, schema, explainData?.rows);
      setOptimizeResult(data.result);
    } catch (err) {
      toast.error('Optimization failed');
    } finally {
      setOptimizing(false);
    }
  }

  // Chart data prep
  const chartData = results?.rows?.slice(0, 20).map((row, i) => {
    const obj = { _label: String(Object.values(row)[0] ?? i) };
    numericCols.forEach(col => { obj[col] = Number(row[col]); });
    return obj;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px',
        borderBottom: '1px solid #1e293b', background: '#0d1117',
        alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => runQuery()} disabled={loading} style={{
          padding: '6px 18px', background: '#4f46e5', border: 'none',
          borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer' }}>
          {loading ? '⏳' : '▶'} Run
          <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 4 }}>Ctrl+Enter</span>
        </button>
        <button onClick={runExplain} disabled={explaining} style={{
          padding: '6px 12px', background: 'none', border: '1px solid #334155',
          borderRadius: 7, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
          {explaining ? '⏳' : '🔍'} Explain
        </button>
        <button onClick={runOptimize} disabled={optimizing} style={{
          padding: '6px 12px', background: 'none', border: '1px solid #334155',
          borderRadius: 7, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
          {optimizing ? '⏳' : '⚡'} AI Optimize
        </button>
        {results?.rows?.length > 0 && (
          <button onClick={() => downloadCSV(results.columns, results.rows)} style={{
            padding: '6px 12px', background: 'none', border: '1px solid #334155',
            borderRadius: 7, color: '#4ade80', fontSize: 12, cursor: 'pointer' }}>
            ⬇ CSV
          </button>
        )}
        {results?.rows?.length > 0 && numericCols.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            {['table','chart'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 10px', fontSize: 11,
                background: view === v ? '#1e293b' : 'none',
                border: '1px solid #334155', borderRadius: 6,
                color: view === v ? '#e2e8f0' : '#64748b', cursor: 'pointer' }}>
                {v === 'table' ? '⊞ Table' : '📊 Chart'}
              </button>
            ))}
            {view === 'chart' && ['bar','line'].map(t => (
              <button key={t} onClick={() => setChartType(t)} style={{
                padding: '6px 10px', fontSize: 11,
                background: chartType === t ? '#1e293b' : 'none',
                border: '1px solid #334155', borderRadius: 6,
                color: chartType === t ? '#e2e8f0' : '#64748b', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
          {sql_val.split('\n').length} lines
        </span>
      </div>

      {/* CodeMirror editor */}
      <div style={{ flex: '0 0 220px', overflow: 'hidden' }}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); runQuery(); } }}>
        <CodeMirror
          value={sql_val}
          onChange={setSql}
          height="220px"
          theme={oneDark}
          extensions={[sql()]}
          style={{ fontSize: 13 }}
          basicSetup={{ lineNumbers: true, foldGutter: false,
            highlightActiveLine: true, autocompletion: true }}
        />
      </div>

      {/* Danger confirm */}
      {confirm && (
        <div style={{ padding: '10px 14px', background: '#7f1d1d',
          border: '1px solid #dc2626', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#fca5a5' }}>
            ⚠️ Destructive query detected. Are you sure?
          </span>
          <button onClick={() => runQuery()} style={{ padding: '5px 12px',
            background: '#dc2626', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 12, cursor: 'pointer' }}>
            Yes, Execute
          </button>
          <button onClick={() => setConfirm(false)} style={{ padding: '5px 12px',
            background: 'none', border: '1px solid #dc2626', borderRadius: 6,
            color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}

      {/* EXPLAIN result */}
      {explainData && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b',
          background: '#07090f' }}>
          <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 6,
            letterSpacing: '0.07em' }}>EXPLAIN PLAN</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>{explainData.columns?.map(col => (
                  <th key={col} style={{ padding: '4px 10px', color: '#475569',
                    borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                    {col}
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {explainData.rows?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    {explainData.columns?.map(col => (
                      <td key={col} style={{ padding: '4px 10px', color: '#94a3b8' }}>
                        {row[col] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Optimize result */}
      {optimizeResult && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #1e293b',
          background: '#07090f' }}>
          <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 8,
            letterSpacing: '0.07em' }}>⚡ AI OPTIMIZATION SUGGESTION</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {optimizeResult.changes?.map((c, i) => (
              <div key={i} style={{ padding: '6px 10px', background: '#1e1b4b',
                border: '1px solid #4f46e5', borderRadius: 7, fontSize: 11 }}>
                <span style={{ color: '#818cf8', fontWeight: 600 }}>{c.what}</span>
                <span style={{ color: '#64748b', marginLeft: 6 }}>{c.why}</span>
              </div>
            ))}
          </div>
          <pre style={{ background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 8, padding: 10, fontSize: 11, color: '#4ade80',
            overflow: 'auto', maxHeight: 120, margin: 0 }}>
            {optimizeResult.optimized_sql}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => updateTab(tab.id, { sql: optimizeResult.optimized_sql })}
              style={{ padding: '5px 12px', background: '#052e16',
                border: '1px solid #16a34a', borderRadius: 6,
                color: '#4ade80', fontSize: 11, cursor: 'pointer' }}>
              ✓ Use this query
            </button>
            <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>
              {optimizeResult.expected_improvement}
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          minHeight: 0, borderTop: '1px solid #1e293b' }}>
          <div style={{ padding: '5px 14px', background: '#0d1117',
            borderBottom: '1px solid #1e293b', display: 'flex', gap: 14,
            alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#4ade80' }}>
              ✓ {results.rowCount} rows
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{results.time}ms</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Table view */}
            {view === 'table' && results.rows?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0d1117', position: 'sticky', top: 0 }}>
                    {results.columns?.map(col => (
                      <th key={col} style={{ padding: '6px 14px', textAlign: 'left',
                        fontSize: 10, color: '#475569',
                        borderBottom: '1px solid #1e293b',
                        letterSpacing: '0.07em' }}>
                        {col.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                      {results.columns?.map(col => (
                        <td key={col} style={{ padding: '6px 14px', fontSize: 12,
                          color: '#e2e8f0' }}>
                          {row[col] === null
                            ? <span style={{ color: '#475569', fontStyle: 'italic' }}>NULL</span>
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Chart view */}
            {view === 'chart' && chartData.length > 0 && (
              <div style={{ padding: 20 }}>
                <ResponsiveContainer width="100%" height={280}>
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="_label" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#0d1117',
                        border: '1px solid #1e293b', fontSize: 12 }} />
                      {numericCols.map((col, i) => (
                        <Bar key={col} dataKey={col}
                          fill={['#6366f1','#10b981','#f59e0b','#ef4444'][i % 4]} />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="_label" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#0d1117',
                        border: '1px solid #1e293b', fontSize: 12 }} />
                      {numericCols.map((col, i) => (
                        <Line key={col} type="monotone" dataKey={col}
                          stroke={['#6366f1','#10b981','#f59e0b','#ef4444'][i % 4]}
                          dot={false} strokeWidth={2} />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {results.rows?.length === 0 && (
              <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
                Query executed. {results.rowCount} rows affected.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EditorTab with multi-tab ─────────────────────────────────
export default function EditorTab() {
  const { sqlTabs, activeTabId, setActiveTabId, addTab, closeTab } = useApp();
  const activeTab = sqlTabs.find(t => t.id === activeTabId) || sqlTabs[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 96px)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center',
        background: '#0a0f1e', borderBottom: '1px solid #1e293b',
        overflowX: 'auto' }}>
        {sqlTabs.map(tab => (
          <div key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              borderRight: '1px solid #1e293b', fontSize: 12,
              background: activeTabId === tab.id ? '#0d1117' : 'none',
              color: activeTabId === tab.id ? '#e2e8f0' : '#64748b',
              borderBottom: activeTabId === tab.id
                ? '2px solid #6366f1' : '2px solid transparent' }}>
            ⌨️ {tab.title}
            {sqlTabs.length > 1 && (
              <span onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                style={{ marginLeft: 4, color: '#475569', fontSize: 14,
                  lineHeight: 1, cursor: 'pointer' }}>×</span>
            )}
          </div>
        ))}
        <button onClick={addTab} style={{ padding: '8px 14px',
          background: 'none', border: 'none', color: '#475569',
          fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>+</button>
      </div>

      {/* Active tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab && <QueryTab key={activeTab.id} tab={activeTab} />}
      </div>
    </div>
  );
}