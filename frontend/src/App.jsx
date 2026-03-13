// frontend/src/App.jsx
// This is the main component — the root of our React app
// It shows the sidebar navigation and renders the active tab
 
import { useState } from 'react';
import { useApp } from './store.jsx';
 
// Import all tab components
import ConnectTab   from './components/ConnectTab.jsx';
import SchemaTab    from './components/SchemaTab.jsx';
import EditorTab    from './components/EditorTab.jsx';
import NLPTab       from './components/NLPTab.jsx';
import SimulatorTab from './components/SimulatorTab.jsx';
import DesignerTab  from './components/DesignerTab.jsx';
import HistoryTab   from './components/HistoryTab.jsx';
import DashboardTab from './components/DashboardTab.jsx';
import ChatTab      from './components/ChatTab.jsx';
import AnomalyTab   from './components/AnomalyTab.jsx';
 
// Tab configuration
const TABS = [
  { id: 'connect',   label: 'Connect',     icon: '🔌' },
  { id: 'schema',    label: 'Schema',      icon: '🗄️' },
  { id: 'editor',    label: 'SQL Editor',  icon: '⌨️' },
  { id: 'nlp',       label: 'NLP → SQL',   icon: '✨' },
  { id: 'simulator', label: 'Simulator',   icon: '🎬' },
  { id: 'designer',  label: 'Designer',    icon: '📐' },
  { id: 'history',   label: 'History',     icon: '📜' },
  { id: 'dashboard', label: 'Dashboard',   icon: '📊' },
  { id: 'chat',      label: 'AI Chat',     icon: '💬' },
  { id: 'anomaly',   label: 'Anomaly',     icon: '🔬' },
];
 
const DIALECTS = ['PostgreSQL', 'MySQL', 'Trino', 'Spark SQL'];
 
export default function App() {
  const [activeTab, setActiveTab] = useState('connect');
  const { connected, schema, dialect, setDialect, queryHistory, feedback } = useApp();
 
  // Render the correct component based on active tab
  function renderTab() {
    switch (activeTab) {
      case 'connect':   return <ConnectTab />;
      case 'schema':    return <SchemaTab />;
      case 'editor':    return <EditorTab />;
      case 'nlp':       return <NLPTab />;
      case 'simulator': return <SimulatorTab />;
      case 'designer':  return <DesignerTab />;
      case 'history':   return <HistoryTab />;
      case 'dashboard': return <DashboardTab />;
      case 'chat':      return <ChatTab />;
      case 'anomaly':   return <AnomalyTab />;
      default:          return <ConnectTab />;
    }
  }
 
  const activeTabConfig = TABS.find(t => t.id === activeTab);
 
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ────────────────────────────────────── */}
      <div style={{
        width: 210, background: '#0a0f1e',
        borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
            QueryMind
          </div>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.12em', marginTop: 1 }}>
            PRO · SQL INTELLIGENCE
          </div>
        </div>
 
        {/* Navigation */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 7,
                border: 'none', cursor: 'pointer',
                marginBottom: 2, fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeTab === tab.id ? '#1e293b' : 'none',
                color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
 
        {/* Dialect picker */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 5,
            letterSpacing: '0.08em' }}>SQL DIALECT</div>
          <select value={dialect} onChange={e => setDialect(e.target.value)} style={{
            width: '100%', background: '#0d1117',
            border: '1px solid #1e293b', borderRadius: 6,
            color: '#e2e8f0', padding: '6px 8px', fontSize: 12,
          }}>
            {DIALECTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
 
        {/* Status */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#16a34a' : '#dc2626',
            }} />
            <span style={{ fontSize: 11, color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? 'Connected' : 'No DB'}
            </span>
          </div>
          {connected && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
              {Object.keys(schema).length} tables loaded
            </div>
          )}
          {feedback.length > 0 && (
            <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
              ✓ {feedback.length} AI feedback items
            </div>
          )}
          {queryHistory.length > 0 && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {queryHistory.length} queries in history
            </div>
          )}
        </div>
      </div>
 
      {/* ── Main Content ────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '11px 22px', borderBottom: '1px solid #1e293b',
          background: '#0a0f1e', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{activeTabConfig?.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{activeTabConfig?.label}</span>
          {(activeTab === 'nlp' || activeTab === 'designer') && (
            <span style={{ padding: '2px 10px', borderRadius: 12,
              background: '#312e81', color: '#818cf8', fontSize: 11 }}>
              AI Powered
            </span>
          )}
          {activeTab === 'simulator' && (
            <span style={{ padding: '2px 10px', borderRadius: 12,
              background: '#1c1400', color: '#f59e0b', fontSize: 11 }}>
              Step-by-step execution
            </span>
          )}
        </div>
 
        {/* Tab content */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: ['editor','schema','simulator','designer'].includes(activeTab)
            ? 0 : '0 24px',
        }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
