// frontend/src/components/SchemaTab.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../store.jsx';
import { getForeignKeys } from '../api.js';

export default function SchemaTab() {
  const { schema } = useApp();
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [mode,      setMode]      = useState('browse'); // 'browse' | 'er'
  const [fks,       setFks]       = useState([]);
  const [fkLoading, setFkLoading] = useState(false);

  const tables = Object.entries(schema);

  // Cross-table column search
  const columnSearchResults = search.length > 1
    ? tables.flatMap(([tname, info]) =>
        (info.columns || [])
          .filter(c => c.column_name?.toLowerCase().includes(search.toLowerCase()))
          .map(c => ({ table: tname, column: c }))
      )
    : [];

  const filteredTables = search.length > 1
    ? tables.filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
    : tables;

  // Load foreign keys when switching to ER mode, or when schema changes (reconnect)
  useEffect(() => {
    if (mode === 'er') {
      setFkLoading(true);
      setFks([]); // clear stale fks on every schema change
      getForeignKeys()
        .then(d => setFks(d.rows || []))
        .catch(() => setFks([]))
        .finally(() => setFkLoading(false));
    }
  }, [mode, schema]); // re-fetch whenever schema changes (e.g. reconnect to different DB)

  const selectedInfo = selected ? schema[selected] : null;

  if (tables.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗄️</div>
        <p>No schema loaded. Connect to a database first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)' }}>
      {/* Left: table list */}
      <div style={{ width: 240, background: '#0d1117',
        borderRight: '1px solid #1e293b', display: 'flex',
        flexDirection: 'column' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', padding: '8px 10px', gap: 4,
          borderBottom: '1px solid #1e293b' }}>
          {[['browse','Browse'],['er','ER Diagram']].map(([v, label]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              flex: 1, padding: '5px 0', fontSize: 11,
              background: mode === v ? '#1e293b' : 'none',
              border: '1px solid #1e293b', borderRadius: 5,
              color: mode === v ? '#e2e8f0' : '#64748b', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search box — searches columns too */}
        <div style={{ padding: '8px 10px 6px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tables & columns…"
            style={{ width: '100%', background: '#07090f',
              border: '1px solid #1e293b', borderRadius: 6,
              color: '#e2e8f0', padding: '7px 10px', fontSize: 12 }}
          />
        </div>

        {/* Column search results */}
        {columnSearchResults.length > 0 && (
          <div style={{ padding: '4px 10px 6px' }}>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4,
              letterSpacing: '0.08em' }}>
              COLUMNS MATCHING "{search}"
            </div>
            {columnSearchResults.slice(0, 8).map((r, i) => (
              <div key={i} onClick={() => setSelected(r.table)}
                style={{ padding: '5px 8px', cursor: 'pointer',
                  borderRadius: 5, marginBottom: 2,
                  background: selected === r.table ? '#1e293b' : 'none' }}>
                <div style={{ fontSize: 11, color: '#6366f1' }}>
                  {r.column.column_name}
                </div>
                <div style={{ fontSize: 10, color: '#475569' }}>
                  in {r.table} · {r.column.data_type}
                </div>
              </div>
            ))}
            <div style={{ borderBottom: '1px solid #1e293b',
              margin: '6px 0' }} />
          </div>
        )}

        <div style={{ fontSize: 10, color: '#475569',
          padding: '2px 10px 4px', letterSpacing: '0.08em' }}>
          {filteredTables.length} TABLE{filteredTables.length !== 1 ? 'S' : ''}
        </div>

        {/* Table list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredTables.map(([name, info]) => (
            <div key={name} onClick={() => setSelected(name)}
              style={{ padding: '8px 10px', cursor: 'pointer',
                background: selected === name ? '#1e293b' : 'none',
                borderLeft: selected === name
                  ? '3px solid #6366f1' : '3px solid transparent' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex',
                alignItems: 'center', gap: 6 }}>
                📋 {name}
              </div>
              <div style={{ fontSize: 10, color: '#475569',
                marginTop: 2, paddingLeft: 18 }}>
                {info.columns?.length} columns
                {info.rows > 0 && ` · ${info.rows.toLocaleString()} rows`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: mode === 'er' ? 0 : 20 }}>
        {mode === 'er' ? (
          <ERDiagram schema={schema} fks={fks} loading={fkLoading}
            onSelect={setSelected} />
        ) : selectedInfo ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {selected}
            </h3>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              {selectedInfo.columns?.length} columns
              {selectedInfo.rows > 0
                && ` · ${selectedInfo.rows.toLocaleString()} rows`}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0d1117' }}>
                  {['Column Name','Data Type','Nullable','Key'].map(h => (
                    <th key={h} style={{ padding: '7px 14px', textAlign: 'left',
                      fontSize: 10, color: '#475569',
                      borderBottom: '1px solid #1e293b',
                      letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedInfo.columns?.map((col, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '7px 14px', fontSize: 13,
                      color: col.is_primary_key ? '#818cf8' : '#e2e8f0',
                      fontWeight: col.is_primary_key ? 600 : 400 }}>
                      {col.column_name}
                    </td>
                    <td style={{ padding: '7px 14px', fontSize: 12,
                      color: '#f59e0b', fontFamily: 'monospace' }}>
                      {col.data_type}
                    </td>
                    <td style={{ padding: '7px 14px', fontSize: 12,
                      color: col.is_nullable === 'NO' ? '#f87171' : '#64748b' }}>
                      {col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}
                    </td>
                    <td style={{ padding: '7px 14px' }}>
                      {col.is_primary_key && (
                        <span style={{ padding: '2px 7px', background: '#312e81',
                          color: '#818cf8', borderRadius: 4, fontSize: 10 }}>PK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#334155' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👈</div>
            Select a table to see its columns
          </div>
        )}
      </div>
    </div>
  );
}

// ── ER Diagram ─────────────────────────────────────────────────────
function ERDiagram({ schema, fks, loading, onSelect }) {
  const [hoveredFk, setHoveredFk] = useState(null);
  const tables = Object.keys(schema);
  const cols   = 3;
  const W = 180, H = 100, GAP_X = 60, GAP_Y = 50;
  const PAD_X = 40, PAD_Y = 40;

  // Position each table in a grid
  const positions = {};
  tables.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[t] = {
      x: PAD_X + col * (W + GAP_X),
      y: PAD_Y + row * (H + GAP_Y),
    };
  });

  const rows   = Math.ceil(tables.length / cols);
  const svgW   = PAD_X * 2 + cols * W + (cols - 1) * GAP_X;
  const svgH   = PAD_Y * 2 + rows * H + (rows - 1) * GAP_Y;

  // Draw FK lines
  function getFKLine(fk) {
    const from = positions[fk.from_table];
    const to   = positions[fk.to_table];
    if (!from || !to) return null;
    const x1 = from.x + W / 2;
    const y1 = from.y + H / 2;
    const x2 = to.x + W / 2;
    const y2 = to.y + H / 2;
    return { x1, y1, x2, y2 };
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
        ⏳ Loading ER diagram…
      </div>
    );
  }

  return (
    <div style={{ overflowAuto: 'both', padding: 10 }}>
      {fks.length === 0 && (
        <div style={{ padding: '8px 16px', background: '#1c1400',
          border: '1px solid #92400e', borderRadius: 8,
          fontSize: 12, color: '#f59e0b', margin: 10 }}>
          ℹ️ No foreign keys found. Tables are shown without relationship lines.
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ minWidth: svgW }}>
        <defs>
          <marker id="fk-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#6366f1"
              strokeWidth="1.5" strokeLinecap="round"/>
          </marker>
        </defs>

        {/* FK lines */}
        {fks.map((fk, i) => {
          const line = getFKLine(fk);
          if (!line) return null;
          const isHovered = hoveredFk === i;
          return (
            <g key={i}>
              <line {...line} stroke={isHovered ? '#818cf8' : '#4f46e5'}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeDasharray={isHovered ? 'none' : '5 3'}
                markerEnd="url(#fk-arrow)"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredFk(i)}
                onMouseLeave={() => setHoveredFk(null)}
              />
              {isHovered && (
                <text x={(line.x1 + line.x2) / 2}
                  y={(line.y1 + line.y2) / 2 - 6}
                  textAnchor="middle" fill="#818cf8" fontSize="11"
                  fontFamily="monospace">
                  {fk.from_column} → {fk.to_column}
                </text>
              )}
            </g>
          );
        })}

        {/* Table boxes */}
        {tables.map(name => {
          const pos  = positions[name];
          const info = schema[name];
          const pkCol = info.columns?.find(c => c.is_primary_key);
          const hasFk = fks.some(f => f.from_table === name || f.to_table === name);
          return (
            <g key={name} style={{ cursor: 'pointer' }}
              onClick={() => onSelect(name)}>
              <rect x={pos.x} y={pos.y} width={W} height={H} rx="8"
                fill="#0d1117"
                stroke={hasFk ? '#4f46e5' : '#1e293b'}
                strokeWidth={hasFk ? 1.5 : 1}
              />
              {/* Table name header */}
              <rect x={pos.x} y={pos.y} width={W} height={28} rx="8"
                fill={hasFk ? '#1e1b4b' : '#0f172a'}/>
              <rect x={pos.x} y={pos.y + 20} width={W} height={8}
                fill={hasFk ? '#1e1b4b' : '#0f172a'}/>
              <text x={pos.x + W / 2} y={pos.y + 18}
                textAnchor="middle" fill="#e2e8f0"
                fontSize="12" fontWeight="600" fontFamily="sans-serif">
                {name}
              </text>
              {/* Columns preview */}
              {info.columns?.slice(0, 3).map((col, ci) => (
                <text key={ci} x={pos.x + 10} y={pos.y + 44 + ci * 16}
                  fill={col.is_primary_key ? '#818cf8' : '#64748b'}
                  fontSize="10" fontFamily="monospace">
                  {col.is_primary_key ? '🔑 ' : '• '}
                  {col.column_name} ({col.data_type})
                </text>
              ))}
              {info.columns?.length > 3 && (
                <text x={pos.x + 10} y={pos.y + 44 + 3 * 16}
                  fill="#334155" fontSize="10" fontFamily="sans-serif">
                  +{info.columns.length - 3} more columns
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}