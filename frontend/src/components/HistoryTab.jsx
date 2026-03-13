// frontend/src/components/HistoryTab.jsx
import { useState } from 'react';
import { useApp } from '../store.jsx';

export default function HistoryTab() {
  const { queryHistory, favourites, toggleFavourite, isFavourite } = useApp();
  const [search,  setSearch]  = useState('');
  const [section, setSection] = useState('all'); // 'all' | 'favourites'

  const list = section === 'favourites' ? favourites : queryHistory;
  const filtered = list.filter(h =>
    h.sql?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16,
        alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Query History</h2>
        {/* Section toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all','All Queries'],['favourites','⭐ Saved']].map(([v, label]) => (
            <button key={v} onClick={() => setSection(v)} style={{
              padding: '5px 12px', fontSize: 12,
              background: section === v ? '#1e293b' : 'none',
              border: '1px solid #1e293b', borderRadius: 6,
              color: section === v ? '#e2e8f0' : '#64748b', cursor: 'pointer' }}>
              {label}
              {v === 'favourites' && (
                <span style={{ marginLeft: 5, background: '#312e81',
                  color: '#818cf8', borderRadius: 10, padding: '1px 6px',
                  fontSize: 10 }}>
                  {favourites.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search queries…"
          style={{ marginLeft: 'auto', background: '#0d1117',
            border: '1px solid #1e293b', borderRadius: 8,
            color: '#e2e8f0', padding: '7px 12px', fontSize: 13, width: 220 }}
        />
      </div>

      {/* Favourites section at top when viewing all */}
      {section === 'all' && favourites.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8,
            letterSpacing: '0.08em' }}>⭐ PINNED QUERIES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {favourites.map((h, i) => (
              <QueryCard key={i} h={h} isFav={true}
                onToggleFav={() => toggleFavourite(h)} pinned />
            ))}
          </div>
          <div style={{ borderBottom: '1px solid #1e293b', margin: '16px 0' }} />
        </div>
      )}

      {/* Main list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>
            {section === 'favourites' ? '⭐' : '📜'}
          </div>
          {section === 'favourites'
            ? 'No saved queries yet. Click ⭐ on any query to save it.'
            : queryHistory.length === 0
              ? 'No queries yet. Run a query from the Editor tab.'
              : 'No results match your search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((h, i) => (
            <QueryCard key={h.id || i} h={h}
              isFav={isFavourite(h.sql)}
              onToggleFav={() => toggleFavourite(h)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueryCard({ h, isFav, onToggleFav, pinned }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(h.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ background: '#0d1117',
      border: `1px solid ${pinned ? '#312e81' : '#1e293b'}`,
      borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center',
        gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%',
          display: 'inline-block', flexShrink: 0,
          background: h.status === 'success' ? '#16a34a' : '#dc2626' }} />
        <span style={{ fontSize: 11, color: '#475569' }}>
          {h.savedAt || h.timestamp}
        </span>
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
          {h.time} · {h.rows} row{h.rows !== 1 ? 's' : ''}
        </span>
        {/* Copy button */}
        <button onClick={copy} style={{ padding: '3px 8px',
          background: 'none', border: '1px solid #1e293b',
          borderRadius: 5, color: '#64748b', fontSize: 10, cursor: 'pointer' }}>
          {copied ? '✓' : '📋'}
        </button>
        {/* Star button */}
        <button onClick={onToggleFav} style={{ padding: '3px 8px',
          background: isFav ? '#1c1400' : 'none',
          border: `1px solid ${isFav ? '#f59e0b' : '#1e293b'}`,
          borderRadius: 5,
          color: isFav ? '#f59e0b' : '#475569',
          fontSize: 12, cursor: 'pointer' }}>
          {isFav ? '⭐' : '☆'}
        </button>
      </div>
      <pre style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap',
        wordBreak: 'break-all', lineHeight: 1.6,
        fontFamily: 'monospace', margin: 0 }}>
        {h.sql}
      </pre>
    </div>
  );
}