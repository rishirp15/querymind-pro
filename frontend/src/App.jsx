// frontend/src/App.jsx
import { useState } from 'react';
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

const TABS = [
  { id: 'connect',   label: 'Connect',     icon: '🔌', group: 'setup' },
  { id: 'schema',    label: 'Schema',      icon: '🗄️', group: 'explore' },
  { id: 'editor',    label: 'SQL Editor',  icon: '⌨️', group: 'query' },
  { id: 'nlp',       label: 'NLP → SQL',   icon: '✨', group: 'query' },
  { id: 'simulator', label: 'Simulator',   icon: '🎬', group: 'query' },
  { id: 'designer',  label: 'Designer',    icon: '📐', group: 'build' },
  { id: 'history',   label: 'History',     icon: '📜', group: 'data' },
  { id: 'dashboard', label: 'Dashboard',   icon: '📊', group: 'data' },
  { id: 'chat',      label: 'AI Chat',     icon: '💬', group: 'ai' },
  { id: 'anomaly',   label: 'Anomaly',     icon: '🔬', group: 'ai' },
];

function AppShell({ onGoHome }) {
  const { connected, dialect, setDialect } = useApp();
  const [activeTab, setActiveTab] = useState('connect');
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

  const nopadTabs = new Set(['editor','simulator','schema','chat']);

  return (
    <div style={{ display:'flex', height:'100vh', background:'#030508', color:'#e2e8f0', fontFamily:'"Syne","Inter",sans-serif', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        .sidebar-btn{
          display:flex;align-items:center;gap:9px;
          width:100%;padding:8px 12px;border-radius:8px;
          border:none;background:none;cursor:pointer;
          font-family:inherit;font-size:13px;font-weight:500;
          color:#475569;transition:all .15s;text-align:left;
          position:relative;
        }
        .sidebar-btn:hover{background:#0d1117;color:#94a3b8;}
        .sidebar-btn.active{background:#111827;color:#e2e8f0;font-weight:600;}
        .sidebar-btn.active::before{
          content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
          width:3px;height:18px;background:#6366f1;border-radius:0 2px 2px 0;
        }
        .sidebar-btn.disabled{opacity:.28;cursor:default;pointer-events:none;}
        .group-label{font-size:9.5px;font-weight:700;color:#1e293b;letter-spacing:.1em;text-transform:uppercase;padding:14px 12px 5px;}
        select{outline:none;}select:focus{border-color:#4f46e5 !important;}
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{ width:196, flexShrink:0, display:'flex', flexDirection:'column', background:'#020407', borderRight:'1px solid #0a0f1a' }}>
        {/* Logo */}
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #0a0f1a' }}>
          <button onClick={onGoHome} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:'5px 6px', borderRadius:8, width:'100%', transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#0d1117'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <div style={{ width:26,height:26,borderRadius:6,background:'linear-gradient(135deg,#6366f1,#4338ca)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0 }}>🧠</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:13,fontWeight:800,letterSpacing:'-.02em',color:'#e2e8f0',lineHeight:1.1 }}>Query<span style={{ color:'#818cf8' }}>Mind</span></div>
              <div style={{ fontSize:9.5,color:'#334155',letterSpacing:'.04em',fontWeight:600 }}>PRO EDITION</div>
            </div>
          </button>
        </div>

        {/* Connection status */}
        <div style={{ margin:'10px 10px 6px', padding:'8px 10px', borderRadius:8, background: connected?'rgba(22,163,74,.08)':'rgba(15,23,42,.6)', border:`1px solid ${connected?'rgba(22,163,74,.2)':'#0f172a'}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:connected?'#4ade80':'#334155',boxShadow:connected?'0 0 6px #4ade80':'none',flexShrink:0 }} />
            <span style={{ fontSize:11.5,fontWeight:600,color:connected?'#4ade80':'#334155' }}>
              {connected ? 'Connected' : 'No connection'}
            </span>
          </div>
          {connected && <div style={{ fontSize:10,color:'#166534',marginTop:3,paddingLeft:12 }}>Schema loaded</div>}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'4px 6px 10px' }}>
          {[
            ['Setup',    TABS.filter(t=>t.group==='setup')],
            ['Explore',  TABS.filter(t=>t.group==='explore')],
            ['Query',    TABS.filter(t=>t.group==='query')],
            ['Build',    TABS.filter(t=>t.group==='build')],
            ['Analytics',TABS.filter(t=>['data','ai'].includes(t.group))],
          ].map(([grp, items]) => (
            <div key={grp}>
              <div className="group-label">{grp}</div>
              {items.map(tab => {
                const locked = tab.id !== 'connect' && tab.id !== 'designer' && !connected;
                return (
                  <button key={tab.id}
                    className={`sidebar-btn${activeTab===tab.id?' active':''}${locked?' disabled':''}`}
                    onClick={() => !locked && setActiveTab(tab.id)}>
                    <span style={{ fontSize:14,width:18,textAlign:'center',flexShrink:0 }}>{tab.icon}</span>
                    <span style={{ flex:1 }}>{tab.label}</span>
                    {locked && <span style={{ fontSize:9,color:'#1e293b',fontWeight:700 }}>🔒</span>}
                    {activeTab===tab.id && <span style={{ width:5,height:5,borderRadius:'50%',background:'#6366f1',flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: dialect selector */}
        <div style={{ padding:'10px', borderTop:'1px solid #0a0f1a' }}>
          <div style={{ fontSize:9.5,color:'#1e293b',letterSpacing:'.08em',fontWeight:700,textTransform:'uppercase',marginBottom:5,paddingLeft:2 }}>SQL Dialect</div>
          <select value={dialect} onChange={e=>setDialect(e.target.value)}
            style={{ width:'100%',background:'#0a0f1a',border:'1px solid #111827',borderRadius:7,color:'#64748b',padding:'6px 10px',fontSize:12,fontFamily:'inherit',cursor:'pointer' }}>
            <option>MySQL</option>
            <option>PostgreSQL</option>
            <option>Trino</option>
            <option>Spark SQL</option>
            <option>SQLite</option>
          </select>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Top bar */}
        <div style={{ height:46, background:'#020407', borderBottom:'1px solid #0a0f1a', display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
          {/* Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <span style={{ color:'#334155', cursor:'pointer', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='#64748b'}
              onMouseLeave={e=>e.target.style.color='#334155'}
              onClick={onGoHome}>QueryMind</span>
            <span style={{ color:'#1e293b' }}>/</span>
            <span style={{ color:'#94a3b8', fontWeight:600 }}>{currentTab?.icon} {currentTab?.label}</span>
          </div>
          <div style={{ flex:1 }} />
          {/* Quick actions */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <div style={{ fontSize:11, color:'#334155', padding:'4px 10px', background:'#07090f', border:'1px solid #0f172a', borderRadius:6 }}>
              Ctrl+Enter to run
            </div>
            <button onClick={onGoHome} style={{ padding:'5px 13px', background:'none', border:'1px solid #111827', borderRadius:7, color:'#475569', fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.color='#818cf8';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#111827';e.currentTarget.style.color='#475569';}}>
              ← Home
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', background:'#030508' }}>
          <div style={{ height:'100%', padding: nopadTabs.has(activeTab) ? 0 : '0 0 0 0' }}>
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('home');

  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background:'#0d1117', color:'#e2e8f0', border:'1px solid #1e293b', fontSize:13, borderRadius:10, fontFamily:'"Syne","Inter",sans-serif' },
          success: { iconTheme:{ primary:'#4ade80', secondary:'#0d1117' } },
          error:   { iconTheme:{ primary:'#f87171', secondary:'#0d1117' } },
        }}
      />
      {view === 'home'
        ? <HomePage onLaunchApp={() => setView('app')} />
        : <AppShell onGoHome={() => setView('home')} />
      }
    </AppProvider>
  );
}