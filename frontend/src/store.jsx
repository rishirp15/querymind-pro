// frontend/src/store.jsx
import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [connected,    setConnected]    = useState(false);
  const [dbConfig,     setDbConfig]     = useState(null);
  const [dialect,      setDialect]      = useState('MySQL');
  const [schema,       setSchema]       = useState({});
  const [queryHistory, setQueryHistory] = useState([]);
  const [feedback,     setFeedback]     = useState([]);
  const [lastQuery,    setLastQuery]     = useState(null);
  const [favourites,   setFavourites]   = useState([]);   // saved queries
  const [perfStats,    setPerfStats]    = useState([]);   // for dashboard
  const [sqlTabs,      setSqlTabs]      = useState([     // multi-tab editor
    { id: 1, title: 'Query 1', sql: '-- Write your SQL here\nSELECT 1;', results: null }
  ]);
  const [activeTabId,  setActiveTabId]  = useState(1);

  function addToHistory(entry) {
    const item = { ...entry, id: Date.now(), timestamp: new Date().toLocaleTimeString() };
    setQueryHistory(prev => [item, ...prev].slice(0, 200));
    // Track for performance dashboard
    setPerfStats(prev => [...prev, {
      time:    entry.time ? parseInt(entry.time) : 0,
      rows:    entry.rows || 0,
      table:   entry.sql?.match(/FROM\s+`?(\w+)`?/i)?.[1] || 'unknown',
      ts:      Date.now(),
    }].slice(-100));
  }

  function addFeedback(entry) {
    setFeedback(prev => [...prev, { ...entry, timestamp: Date.now() }].slice(-20));
  }

  function toggleFavourite(query) {
    setFavourites(prev => {
      const exists = prev.find(f => f.sql === query.sql);
      if (exists) return prev.filter(f => f.sql !== query.sql);
      return [...prev, { ...query, savedAt: new Date().toLocaleTimeString() }];
    });
  }

  function isFavourite(sql) {
    return favourites.some(f => f.sql === sql);
  }

  // Tab management
  function addTab() {
    const id = Date.now();
    setSqlTabs(prev => [...prev, {
      id, title: `Query ${prev.length + 1}`,
      sql: '-- New query\nSELECT 1;', results: null
    }]);
    setActiveTabId(id);
  }

  function closeTab(id) {
    setSqlTabs(prev => {
      const remaining = prev.filter(t => t.id !== id);
      if (remaining.length === 0) return prev; // keep at least one
      return remaining;
    });
    setActiveTabId(prev => prev === id
      ? sqlTabs.find(t => t.id !== id)?.id || sqlTabs[0].id
      : prev
    );
  }

  function updateTab(id, changes) {
    setSqlTabs(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  }

  return (
    <AppContext.Provider value={{
      connected,   setConnected,
      dbConfig,    setDbConfig,
      dialect,     setDialect,
      schema,      setSchema,
      queryHistory, addToHistory,
      feedback,    addFeedback,
      lastQuery,   setLastQuery,
      favourites,  toggleFavourite, isFavourite,
      perfStats,
      sqlTabs,     activeTabId, setActiveTabId, addTab, closeTab, updateTab,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}