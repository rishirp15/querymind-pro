// frontend/src/components/NLPTab.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { nlpToSQL, executeSQL } from '../api.js';
import { useApp } from '../store.jsx';

const EXAMPLES = [
  'Show top 10 customers by total revenue',
  'How many orders were placed this month?',
  'Find products with stock less than 10',
  'What is the average order value per country?',
  'Show all pending orders with customer names',
  'Which customer placed the most orders?',
];

export default function NLPTab() {
  const { schema, dialect, feedback, addFeedback, setLastQuery, addToHistory } = useApp();

  const [question,   setQuestion]   = useState('');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fbGiven,    setFbGiven]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [runResult,  setRunResult]  = useState(null);
  const [copied,     setCopied]     = useState(false);

  // ── Generate SQL from natural language ───────────────────────────
  async function generate(q = question) {
    if (!q.trim()) return;
    setLoading(true);
    setFbGiven(false);
    setResult(null);
    setRunResult(null);
    try {
      const data = await nlpToSQL(q, dialect, schema, feedback);
      setResult(data.result);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Run the generated SQL directly ───────────────────────────────
  async function runDirectly() {
    if (!result?.sql) return;
    setRunning(true);
    setRunResult(null);
    try {
      const data = await executeSQL(result.sql);
      setRunResult(data);
      setLastQuery({
        sql:     result.sql,
        time:    data.time,
        rows:    data.rowCount,
        columns: data.columns,
        results: data.rows?.slice(0, 5),
      });
      addToHistory({
        sql:    result.sql,
        time:   data.time + 'ms',
        rows:   data.rowCount,
        status: 'success',
      });
      toast.success(`✓ ${data.rowCount} rows · ${data.time}ms`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Execution failed');
      addToHistory({ sql: result.sql, time: '—', rows: 0, status: 'error' });
    } finally {
      setRunning(false);
    }
  }

  // ── Copy SQL to clipboard ─────────────────────────────────────────
  function copySQL() {
    if (!result?.sql) return;
    navigator.clipboard.writeText(result.sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('SQL copied!');
    });
  }

  // ── Feedback ──────────────────────────────────────────────────────
  function handleFeedback(type, note = '') {
    addFeedback({ type, note, query: result?.sql });
    setFbGiven(true);
    toast.success(
      type === 'positive'
        ? 'Thanks! AI will keep this style.'
        : 'Noted! AI will improve next time.'
    );
  }

  // ── Confidence color ──────────────────────────────────────────────
  function confidenceColor(c) {
    if (!c) return '#64748b';
    if (c >= 0.85) return '#4ade80';
    if (c >= 0.65) return '#f59e0b';
    return '#f87171';
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 0' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        ✨ Natural Language → SQL
      </h2>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 13 }}>
        Describe what you want in plain English. The AI writes the SQL for you.
        {Object.keys(schema).length > 0 && (
          <span style={{ marginLeft: 8, padding: '2px 8px',
            background: '#052e16', color: '#4ade80',
            borderRadius: 4, fontSize: 11 }}>
            ✓ Schema loaded — {Object.keys(schema).length} tables
          </span>
        )}
      </p>

      {/* ── Input box ───────────────────────────────────────────── */}
      <div style={{ background: '#0d1117', border: '1px solid #1e293b',
        borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              generate();
            }
          }}
          placeholder="e.g. Show me the top 5 customers by total spending this year"
          rows={3}
          style={{ width: '100%', background: 'none', border: 'none',
            color: '#e2e8f0', fontSize: 14, resize: 'none',
            lineHeight: 1.6, fontFamily: 'sans-serif' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 10 }}>
          {/* Dialect badge */}
          <span style={{ fontSize: 11, color: '#475569' }}>
            Dialect: <span style={{ color: '#818cf8' }}>{dialect}</span>
          </span>
          <button
            onClick={() => generate()}
            disabled={loading || !question.trim()}
            style={{ padding: '9px 24px', background: '#4f46e5',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: loading || !question.trim() ? 0.5 : 1 }}>
            {loading ? '⏳ Generating…' : '✨ Generate SQL'}
          </button>
        </div>
      </div>

      {/* ── Example prompts ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8,
          letterSpacing: '0.07em' }}>
          QUICK EXAMPLES — Click to try:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i}
              onClick={() => { setQuestion(ex); generate(ex); }}
              style={{ padding: '6px 12px', background: '#0d1117',
                border: '1px solid #1e293b', borderRadius: 20,
                color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div style={{ background: '#0d1117', border: '1px solid #1e293b',
          borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#0f172a',
            display: 'flex', gap: 8 }}>
            {[60, 100, 70].map((w, i) => (
              <div key={i} style={{ height: 18, width: w,
                background: '#1e293b', borderRadius: 4,
                animation: 'shimmer 1.2s ease-in-out infinite',
                animationDelay: i * 0.15 + 's' }} />
            ))}
          </div>
          <div style={{ padding: 20 }}>
            {[90, 75, 85, 60].map((w, i) => (
              <div key={i} style={{ height: 14, width: w + '%',
                background: '#1e293b', borderRadius: 4,
                marginBottom: 10,
                animation: 'shimmer 1.2s ease-in-out infinite',
                animationDelay: i * 0.1 + 's' }} />
            ))}
          </div>
          <style>{`
            @keyframes shimmer {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ── Result card ──────────────────────────────────────────── */}
      {result && !loading && (
        <div style={{ background: '#0d1117', border: '1px solid #1e293b',
          borderRadius: 12, overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{ padding: '10px 16px', background: '#0f172a',
            display: 'flex', alignItems: 'center', gap: 10,
            flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', borderRadius: 12,
              background: '#312e81', color: '#818cf8',
              fontSize: 11, fontWeight: 700 }}>
              {dialect}
            </span>
            {result.confidence !== undefined && (
              <span style={{ fontSize: 12,
                color: confidenceColor(result.confidence) }}>
                {Math.round(result.confidence * 100)}% confidence
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11,
              color: '#475569' }}>
              {result.sql?.split('\n').length} lines
            </span>
          </div>

          {/* SQL code */}
          <pre style={{ padding: '16px 20px', fontSize: 13,
            color: '#e2e8f0', overflow: 'auto', lineHeight: 1.8,
            maxHeight: 320, fontFamily: 'monospace', margin: 0,
            background: '#07090f',
            borderBottom: '1px solid #1e293b' }}>
            {result.sql}
          </pre>

          {/* Explanation */}
          {result.explanation && (
            <div style={{ padding: '12px 16px',
              borderBottom: '1px solid #1e293b',
              fontSize: 13, color: '#94a3b8', lineHeight: 1.6,
              background: '#0a0f1e' }}>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>
                💡 What this does:{' '}
              </span>
              {result.explanation}
            </div>
          )}

          {/* Action buttons: Run + Copy */}
          <div style={{ padding: '12px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#0d1117' }}>
            <button
              onClick={runDirectly}
              disabled={running}
              style={{ padding: '8px 20px', background: '#052e16',
                border: '1px solid #16a34a', borderRadius: 8,
                color: '#4ade80', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                opacity: running ? 0.6 : 1 }}>
              {running ? '⏳ Running…' : '▶ Run this query'}
            </button>
            <button
              onClick={copySQL}
              style={{ padding: '8px 16px', background: 'none',
                border: '1px solid #334155', borderRadius: 8,
                color: copied ? '#4ade80' : '#64748b',
                fontSize: 12, cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : '📋 Copy SQL'}
            </button>
            <button
              onClick={() => { setQuestion(''); setResult(null); setRunResult(null); }}
              style={{ padding: '8px 16px', background: 'none',
                border: '1px solid #334155', borderRadius: 8,
                color: '#64748b', fontSize: 12, cursor: 'pointer',
                marginLeft: 'auto' }}>
              ✕ Clear
            </button>
          </div>

          {/* Inline run results */}
          {runResult && (
            <div style={{ borderBottom: '1px solid #1e293b',
              background: '#07090f' }}>
              <div style={{ padding: '8px 16px',
                display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
                  ✓ {runResult.rowCount} rows returned
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {runResult.time}ms
                </span>
                <span style={{ fontSize: 11, color: '#475569',
                  marginLeft: 'auto' }}>
                  showing first 10
                </span>
              </div>

              {runResult.rows?.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: 260,
                  overflowY: 'auto' }}>
                  <table style={{ width: '100%',
                    borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0d1117',
                        position: 'sticky', top: 0 }}>
                        {runResult.columns?.map(col => (
                          <th key={col} style={{ padding: '6px 14px',
                            textAlign: 'left', fontSize: 10,
                            color: '#475569',
                            borderBottom: '1px solid #1e293b',
                            letterSpacing: '0.07em',
                            whiteSpace: 'nowrap' }}>
                            {col.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResult.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: '1px solid #0f172a',
                          background: i % 2 === 0 ? 'transparent' : '#050810'
                        }}>
                          {runResult.columns?.map(col => (
                            <td key={col} style={{ padding: '6px 14px',
                              fontSize: 12, color: '#e2e8f0',
                              whiteSpace: 'nowrap' }}>
                              {row[col] === null || row[col] === undefined ? (
                                <span style={{ color: '#334155',
                                  fontStyle: 'italic', fontSize: 11 }}>
                                  NULL
                                </span>
                              ) : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', fontSize: 13,
                  color: '#64748b' }}>
                  Query executed successfully. {runResult.rowCount} rows affected.
                </div>
              )}
            </div>
          )}

          {/* Feedback bar */}
          <div style={{ padding: '10px 16px', background: '#0a0f1e' }}>
            {fbGiven ? (
              <div style={{ fontSize: 12, color: '#4ade80' }}>
                ✓ Feedback saved — AI will use this to improve future responses
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#475569' }}>
                  Was the SQL correct?
                </span>
                <button
                  onClick={() => handleFeedback('positive')}
                  style={{ padding: '4px 14px', background: '#052e16',
                    border: '1px solid #16a34a', borderRadius: 6,
                    color: '#4ade80', fontSize: 12, cursor: 'pointer' }}>
                  👍 Yes
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  style={{ padding: '4px 14px', background: '#450a0a',
                    border: '1px solid #dc2626', borderRadius: 6,
                    color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                  👎 Needs fix
                </button>
                <span style={{ fontSize: 11, color: '#334155',
                  marginLeft: 'auto' }}>
                  {feedback.length > 0 &&
                    `${feedback.length} feedback item${feedback.length > 1 ? 's' : ''} saved`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 0',
          color: '#334155' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
          <p style={{ fontSize: 13 }}>
            Type a question above or pick an example to get started
          </p>
          {Object.keys(schema).length === 0 && (
            <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>
              ⚠️ No database connected — connect first for schema-aware SQL
            </p>
          )}
        </div>
      )}
    </div>
  );
}