// frontend/src/components/DashboardTab.jsx
import { useApp } from '../store.jsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardTab() {
  const { queryHistory, perfStats } = useApp();

  const totalQueries  = queryHistory.length;
  const successCount  = queryHistory.filter(h => h.status === 'success').length;
  const avgTime       = perfStats.length
    ? Math.round(perfStats.reduce((s, p) => s + p.time, 0) / perfStats.length)
    : 0;
  const slowest       = perfStats.length
    ? Math.max(...perfStats.map(p => p.time)) : 0;

  // Slowest queries
  const slowestQueries = [...queryHistory]
    .filter(h => h.status === 'success')
    .sort((a, b) => parseInt(b.time) - parseInt(a.time))
    .slice(0, 5);

  // Most queried tables
  const tableCounts = {};
  perfStats.forEach(p => {
    tableCounts[p.table] = (tableCounts[p.table] || 0) + 1;
  });
  const tableChart = Object.entries(tableCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Timeline
  const timelineData = perfStats.slice(-20).map((p, i) => ({
    i, time: p.time, rows: p.rows
  }));

  return (
    <div style={{ padding: '20px 4px', overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
        📊 Performance Dashboard
      </h2>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 28 }}>
        {[
          ['Total Queries',   totalQueries,          '#6366f1'],
          ['Success Rate',    totalQueries > 0
            ? Math.round(successCount / totalQueries * 100) + '%'
            : '—',                                   '#10b981'],
          ['Avg Time',        avgTime ? avgTime + 'ms' : '—', '#f59e0b'],
          ['Slowest Query',   slowest ? slowest + 'ms' : '—', '#ef4444'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: '#0d1117',
            border: `1px solid ${color}30`,
            borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748b',
              letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {totalQueries === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <p>Run some queries to see performance stats here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 20 }}>
          {/* Execution time timeline */}
          <div style={{ background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
              Execution Time (last 20 queries)
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }}
                  unit="ms" width={45} />
                <Tooltip contentStyle={{ background: '#0d1117',
                  border: '1px solid #1e293b', fontSize: 11 }}
                  formatter={v => [v + 'ms', 'time']} />
                <Line type="monotone" dataKey="time" stroke="#6366f1"
                  dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Most queried tables */}
          <div style={{ background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
              Most Queried Tables
            </div>
            {tableChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tableChart} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={80}
                    tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0d1117',
                    border: '1px solid #1e293b', fontSize: 11 }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#475569', fontSize: 13, padding: 20 }}>
                No table data yet
              </div>
            )}
          </div>

          {/* Slowest queries */}
          <div style={{ background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 10, padding: '16px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
              Slowest Queries
            </div>
            {slowestQueries.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 13 }}>No data yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse',
                fontSize: 12 }}>
                <thead>
                  <tr>{['Time','Rows','Query'].map(h => (
                    <th key={h} style={{ padding: '5px 12px', textAlign: 'left',
                      fontSize: 10, color: '#475569',
                      borderBottom: '1px solid #1e293b' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {slowestQueries.map((q, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={{ padding: '6px 12px', color: '#f87171',
                        fontWeight: 600, whiteSpace: 'nowrap' }}>{q.time}</td>
                      <td style={{ padding: '6px 12px', color: '#64748b',
                        whiteSpace: 'nowrap' }}>{q.rows}</td>
                      <td style={{ padding: '6px 12px', color: '#94a3b8',
                        fontFamily: 'monospace', maxWidth: 400,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' }}>{q.sql}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}