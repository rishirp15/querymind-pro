// frontend/src/App.jsx
import { useState, createContext, useContext } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './store.jsx';
import HomePage from './pages/homepage.jsx';

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

// ── Theme Context ─────────────────────────────────────────────────
export const ThemeContext = createContext({ dark: true, setDark: () => {} });
export const useTheme = () => useContext(ThemeContext);

const TABS = [
  { id: 'connect',   label: 'Connect',    icon: '🔌', group: 'Setup',     desc: 'Database connection' },
  { id: 'schema',    label: 'Schema',     icon: '🗄️', group: 'Explore',   desc: 'Tables & ER diagram' },
  { id: 'editor',    label: 'SQL Editor', icon: '⌨️', group: 'Query',     desc: 'Multi-tab editor' },
  { id: 'nlp',       label: 'NLP → SQL',  icon: '✨', group: 'Query',     desc: 'AI query generation' },
  { id: 'simulator', label: 'Simulator',  icon: '🎬', group: 'Query',     desc: 'Execution pipeline' },
  { id: 'designer',  label: 'Designer',   icon: '📐', group: 'Build',     desc: 'AI schema design' },
  { id: 'history',   label: 'History',    icon: '📜', group: 'Analytics', desc: 'Query log & favourites' },
  { id: 'dashboard', label: 'Dashboard',  icon: '📊', group: 'Analytics', desc: 'Performance stats' },
  { id: 'chat',      label: 'AI Chat',    icon: '💬', group: 'AI',        desc: 'Conversational AI' },
  { id: 'anomaly',   label: 'Anomaly',    icon: '🔬', group: 'AI',        desc: 'Data health scan' },
];

const GROUPS = ['Setup', 'Explore', 'Query', 'Build', 'Analytics', 'AI'];
const NO_PAD = new Set(['editor', 'simulator', 'schema', 'chat']);

// ── Theme tokens ──────────────────────────────────────────────────
function getTheme(dark) {
  return {
    bg:        dark ? '#050914' : '#f4f7ff',
    bgSide:    dark ? '#020408' : '#ffffff',
    bgCard:    dark ? '#0a0e1a' : '#ffffff',
    bgHov:     dark ? '#0d1120' : '#f0f4ff',
    bgActive:  dark ? '#111827' : '#eff2ff',
    bgTop:     dark ? '#020408' : '#fafbff',
    border:    dark ? '#131b2e' : '#e2e9f5',
    borderAcc: dark ? '#3730a3' : '#c7d2fe',
    text:      dark ? '#e2e8f0' : '#0f172a',
    textSub:   dark ? '#64748b' : '#64748b',
    textMuted: dark ? '#2d3f5c' : '#94a3b8',
    accent:    '#6366f1',
    accentGlow:dark ? 'rgba(99,102,241,.22)' : 'rgba(99,102,241,.12)',
    green:     '#4ade80',
    greenGlow: dark ? 'rgba(74,222,128,.15)' : 'rgba(74,222,128,.1)',
    pill:      dark ? 'rgba(99,102,241,.1)' : 'rgba(99,102,241,.07)',
    pillBord:  dark ? 'rgba(99,102,241,.22)' : 'rgba(99,102,241,.18)',
    pillText:  dark ? '#818cf8' : '#4f46e5',
  };
}

function AppShell({ onGoHome, dark, setDark }) {
  const { connected, dialect, setDialect, queryHistory, perfStats } = useApp();
  const [activeTab, setActiveTab] = useState('connect');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const T = getTheme(dark);
  const currentTab = TABS.find(t => t.id === activeTab);

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

  const sideW = sidebarCollapsed ? 60 : 210;

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: T.bg, color: T.text,
      fontFamily: "'Space Grotesk','Inter',sans-serif",
      transition: 'background .3s,color .3s',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .tab-btn {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 8px 10px; border-radius: 9px; border: none;
          background: none; cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 500; color: ${T.textSub};
          transition: all .15s; text-align: left; position: relative;
          white-space: nowrap; overflow: hidden;
        }
        .tab-btn:hover:not(.locked) {
          background: ${T.bgHov}; color: ${T.text};
        }
        .tab-btn.active {
          background: ${T.bgActive}; color: ${T.text}; font-weight: 600;
        }
        .tab-btn.active::before {
          content: ''; position: absolute; left: 0; top: 50%;
          transform: translateY(-50%); width: 3px; height: 20px;
          background: linear-gradient(to bottom, #818cf8, #6366f1);
          border-radius: 0 2px 2px 0;
        }
        .tab-btn.locked { opacity: .22; cursor: not-allowed; }
        .grp-label {
          font-size: 9px; font-weight: 800; color: ${T.textMuted};
          letter-spacing: .12em; text-transform: uppercase;
          padding: 14px 10px 5px;
        }
        .icon-wrap {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 14px;
        }
        .top-action {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 8px; font-size: 12px;
          font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all .18s; border: 1px solid ${T.border};
          background: ${T.bgCard}; color: ${T.textSub};
        }
        .top-action:hover { border-color: ${T.accent}; color: ${T.accent}; }
        .theme-toggle {
          width: 34px; height: 34px; border-radius: 9px;
          border: 1px solid ${T.border}; background: ${T.bgCard};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 15px; transition: all .2s;
          color: ${T.text};
        }
        .theme-toggle:hover {
          border-color: ${T.accent};
          box-shadow: 0 0 14px ${T.accentGlow};
        }
        select { outline: none; }
        select:focus { border-color: ${T.accent} !important; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .content-area { animation: slideIn .2s ease both; }
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.4)} 70%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }
      `}</style>

      {/* ── SIDEBAR ────────────────────────────────────────────── */}
      <div style={{
        width: sideW, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: T.bgSide,
        borderRight: `1px solid ${T.border}`,
        transition: 'width .25s cubic-bezier(.22,1,.36,1)',
        overflow: 'hidden',
      }}>
        {/* Logo + collapse */}
        <div style={{
          padding: '13px 10px 11px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          gap: 8,
        }}>
          {!sidebarCollapsed && (
            <button onClick={onGoHome} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 8, flex: 1,
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = T.bgHov}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#4338ca)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: `0 0 16px ${T.accentGlow}`,
              }}>🧠</div>
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 14, fontWeight: 900, letterSpacing: '-.02em',
                  color: T.text, lineHeight: 1.1, whiteSpace: 'nowrap',
                }}>Query<span style={{ color: '#818cf8' }}>Mind</span></div>
                <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: '.08em', fontWeight: 700 }}>PRO EDITION</div>
              </div>
            </button>
          )}
          {sidebarCollapsed && (
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,#6366f1,#4338ca)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: 'pointer', flexShrink: 0,
            }} onClick={onGoHome}>🧠</div>
          )}
          <button onClick={() => setSidebarCollapsed(c => !c)} style={{
            width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`,
            background: T.bgCard, cursor: 'pointer', fontSize: 11,
            color: T.textSub, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}>
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        {/* Connection status pill */}
        {!sidebarCollapsed && (
          <div style={{
            margin: '10px 10px 6px',
            padding: '9px 12px', borderRadius: 10,
            background: connected ? 'rgba(22,163,74,.07)' : T.bgCard,
            border: `1px solid ${connected ? 'rgba(74,222,128,.2)' : T.border}`,
            transition: 'all .3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: connected ? '#4ade80' : T.textMuted,
                animation: connected ? 'pulseGreen 2s infinite' : 'none',
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: connected ? '#4ade80' : T.textMuted }}>
                {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {connected && (
              <div style={{ fontSize: 10.5, color: '#16a34a', marginTop: 3, paddingLeft: 14 }}>
                Schema loaded ✓
              </div>
            )}
          </div>
        )}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#4ade80' : T.textMuted,
              animation: connected ? 'pulseGreen 2s infinite' : 'none',
            }} />
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px 10px' }}>
          {GROUPS.map(grp => {
            const items = TABS.filter(t => t.group === grp);
            return (
              <div key={grp}>
                {!sidebarCollapsed && <div className="grp-label">{grp}</div>}
                {sidebarCollapsed && <div style={{ height: 10 }} />}
                {items.map(tab => {
                  const locked = !connected && tab.id !== 'connect' && tab.id !== 'designer';
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className={`tab-btn${isActive ? ' active' : ''}${locked ? ' locked' : ''}`}
                      onClick={() => !locked && setActiveTab(tab.id)}
                      title={sidebarCollapsed ? tab.label : undefined}
                      style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '8px' : '8px 10px' }}>
                      <span className="icon-wrap" style={{
                        background: isActive ? T.accent + '18' : 'transparent',
                        transition: 'background .15s',
                      }}>
                        {tab.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                          {locked && <span style={{ fontSize: 9, color: T.textMuted }}>🔒</span>}
                          {isActive && <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom: stats + dialect */}
        {!sidebarCollapsed && (
          <div style={{ padding: '10px', borderTop: `1px solid ${T.border}` }}>
            {/* Mini stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10,
            }}>
              {[
                ['Queries', queryHistory.length],
                ['Avg ms', perfStats.length ? Math.round(perfStats.reduce((s, p) => s + p.time, 0) / perfStats.length) : 0],
              ].map(([l, v]) => (
                <div key={l} style={{
                  background: T.bgCard, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: '7px 9px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: T.accent, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 2, fontWeight: 600, letterSpacing: '.04em' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Dialect selector */}
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5, paddingLeft: 2 }}>SQL Dialect</div>
              <select
                value={dialect}
                onChange={e => setDialect(e.target.value)}
                style={{
                  width: '100%', background: T.bgCard, border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.textSub, padding: '7px 10px',
                  fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                  transition: 'border-color .15s',
                }}>
                <option>MySQL</option>
                <option>PostgreSQL</option>
                <option>SQLite</option>
                <option>Trino</option>
                <option>Spark SQL</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN AREA ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── TOP BAR ─────────────────────────────────────────── */}
        <div style={{
          height: 50, background: T.bgTop,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, minWidth: 0 }}>
            <span style={{ color: T.textMuted, cursor: 'pointer', fontWeight: 500, transition: 'color .15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.target.style.color = T.accent}
              onMouseLeave={e => e.target.style.color = T.textMuted}
              onClick={onGoHome}>QueryMind</span>
            <span style={{ color: T.textMuted, fontSize: 16 }}>/</span>
            <span style={{ color: T.text, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTab?.icon} {currentTab?.label}
            </span>
            {currentTab?.desc && (
              <>
                <span style={{ color: T.textMuted, fontSize: 16 }}>/</span>
                <span style={{ color: T.textSub, fontSize: 12, whiteSpace: 'nowrap' }}>{currentTab.desc}</span>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Right actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {/* Keyboard hint */}
            <div style={{
              fontSize: 11, color: T.textMuted,
              padding: '4px 10px', borderRadius: 6, fontFamily: "'JetBrains Mono',monospace",
              border: `1px solid ${T.border}`, background: T.bgCard,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ padding: '1px 5px', background: T.border, borderRadius: 3, fontSize: 10 }}>Ctrl</span>
              <span>+</span>
              <span style={{ padding: '1px 5px', background: T.border, borderRadius: 3, fontSize: 10 }}>Enter</span>
              <span>to run</span>
            </div>

            {/* Connection indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 8,
              background: connected ? 'rgba(74,222,128,.06)' : T.bgCard,
              border: `1px solid ${connected ? 'rgba(74,222,128,.2)' : T.border}`,
              fontSize: 11.5, fontWeight: 600,
              color: connected ? '#4ade80' : T.textMuted,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#4ade80' : T.textMuted,
                animation: connected ? 'pulseGreen 2s infinite' : 'none',
              }} />
              {connected ? 'DB Connected' : 'No DB'}
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={() => setDark(d => !d)} title="Toggle theme">
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Home button */}
            <button className="top-action" onClick={onGoHome}>
              ← Home
            </button>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <div key={activeTab} className="content-area" style={{
          flex: 1, overflow: 'auto',
          background: T.bg,
          padding: NO_PAD.has(activeTab) ? 0 : '0 28px 28px',
        }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home');
  const [dark, setDark] = useState(true);

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      <AppProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: dark ? '#0d1117' : '#ffffff',
              color: dark ? '#e2e8f0' : '#0f172a',
              border: `1px solid ${dark ? '#1e293b' : '#e2e9f5'}`,
              fontSize: 13, borderRadius: 12,
              fontFamily: "'Space Grotesk',sans-serif",
              boxShadow: '0 8px 32px rgba(0,0,0,.2)',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: dark ? '#0d1117' : '#fff' } },
            error:   { iconTheme: { primary: '#f87171', secondary: dark ? '#0d1117' : '#fff' } },
          }}
        />
        {view === 'home'
          ? <HomePage onLaunchApp={() => setView('app')} />
          : <AppShell onGoHome={() => setView('home')} dark={dark} setDark={setDark} />
        }
      </AppProvider>
    </ThemeContext.Provider>
  );
}