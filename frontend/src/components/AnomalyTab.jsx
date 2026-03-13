// frontend/src/components/AnomalyTab.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { detectAnomalies, executeSQL } from '../api.js';
import { useApp } from '../store.jsx';

export default function AnomalyTab() {
  const { schema, dialect } = useApp();
  const [loading, setLoading] = useState(false);
  const [report,  setReport]  = useState(null);

  async function runScan() {
    setLoading(true);
    try {
      // Collect sample data from each table
      const sampleData = {};
      for (const tableName of Object.keys(schema).slice(0, 5)) {
        try {
          const result = await executeSQL(
            `SELECT * FROM \`${tableName}\` LIMIT 20`
          );
          sampleData[tableName] = {
            rows:    result.rows,
            columns: result.columns,
          };
        } catch (e) {
          sampleData[tableName] = { rows: [], columns: [] };
        }
      }
      const data = await detectAnomalies(schema, sampleData, dialect);
      setReport(data.result);
      toast.success('Scan complete!');
    } catch (err) {
      toast.error('Scan failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  const severityColor = {
    high:   { bg: '#450a0a', border: '#dc2626', text: '#f87171' },
    medium: { bg: '#1c1400', border: '#f59e0b', text: '#fbbf24' },
    low:    { bg: '#0c1a0c', border: '#16a34a', text: '#4ade80' },
  };

  return (
    <div style={{ padding: '20px 0', overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
        🔬 Data Anomaly Detection
      </h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        AI scans your tables for nulls, duplicates, outliers, and broken
        foreign keys — then suggests fixes.
      </p>

      <button onClick={runScan} disabled={loading} style={{
        padding: '10px 24px', background: '#4f46e5',
        border: 'none', borderRadius: 8, color: '#fff',
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        marginBottom: 24, opacity: loading ? 0.6 : 1 }}>
        {loading ? '⏳ Scanning…' : '🔬 Run Full Scan'}
      </button>

      {report && (
        <>
          {/* Health score */}
          <div style={{ display: 'flex', alignItems: 'center',
            gap: 16, marginBottom: 24, padding: '16px 20px',
            background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 12 }}>
            <div style={{ fontSize: 48, fontWeight: 900,
              color: report.health_score >= 80 ? '#4ade80'
                : report.health_score >= 60 ? '#f59e0b' : '#f87171' }}>
              {report.health_score}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Health Score</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {report.summary}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {['high','medium','low'].map(sev => {
                const count = report.issues?.filter(i => i.severity === sev).length || 0;
                const c = severityColor[sev];
                return (
                  <div key={sev} style={{ padding: '6px 12px',
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700,
                      color: c.text }}>{count}</div>
                    <div style={{ fontSize: 10, color: c.text }}>{sev}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issues list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.issues?.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center',
                color: '#4ade80', fontSize: 14 }}>
                ✅ No issues found! Your data looks clean.
              </div>
            ) : (
              report.issues?.map((issue, i) => {
                const c = severityColor[issue.severity] || severityColor.low;
                return (
                  <div key={i} style={{ background: '#0d1117',
                    border: `1px solid ${c.border}30`,
                    borderLeft: `3px solid ${c.border}`,
                    borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center',
                      gap: 10, marginBottom: 8 }}>
                      <span style={{ padding: '2px 8px',
                        background: c.bg, color: c.text,
                        borderRadius: 4, fontSize: 10,
                        fontWeight: 700 }}>
                        {issue.severity?.toUpperCase()}
                      </span>
                      <span style={{ padding: '2px 8px',
                        background: '#0f172a', color: '#94a3b8',
                        borderRadius: 4, fontSize: 10 }}>
                        {issue.issue_type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600,
                        color: '#e2e8f0' }}>
                        {issue.table}.{issue.column}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8',
                      margin: '0 0 10px', lineHeight: 1.5 }}>
                      {issue.description}
                    </p>
                    {issue.fix_sql && (
                      <div style={{ background: '#07090f',
                        border: '1px solid #1e293b', borderRadius: 8,
                        padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: '#64748b',
                          marginBottom: 4, letterSpacing: '0.07em' }}>
                          SUGGESTED FIX
                        </div>
                        <pre style={{ margin: 0, fontSize: 11,
                          color: '#4ade80', fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap' }}>
                          {issue.fix_sql}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {!report && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
          <p>Click Run Full Scan to analyze your database for issues.</p>
        </div>
      )}
    </div>
  );
}