// frontend/src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';

const FEATURES = [
  { icon: '✦', title: 'NLP → SQL', desc: 'Type in plain English. Receive precise, dialect-aware SQL in milliseconds with 95%+ accuracy.', tag: 'AI Core', accent: '#a78bfa' },
  { icon: '⌘', title: 'Pro SQL Editor', desc: 'CodeMirror 6 with syntax highlighting, multi-tab workspace, and Ctrl+Enter execution.', tag: 'Editor', accent: '#38bdf8' },
  { icon: '◈', title: 'ER Diagram', desc: 'Auto-generated entity-relationship diagrams with real FK lines. Click to inspect.', tag: 'Schema', accent: '#34d399' },
  { icon: '⚡', title: 'AI Optimizer', desc: 'Submit any slow query. Receive a rewritten version with line-by-line explanation.', tag: 'Performance', accent: '#fb923c' },
  { icon: '◉', title: 'Query Simulator', desc: '8-stage animated pipeline: tokenize → parse → analyze → plan → execute. Educational and beautiful.', tag: 'Visualization', accent: '#f472b6' },
  { icon: '⬡', title: 'Anomaly Detection', desc: 'AI health scan surfaces NULLs, duplicates, outliers and broken foreign keys with fix SQL.', tag: 'Quality', accent: '#a3e635' },
  { icon: '◷', title: 'Performance Dashboard', desc: 'Live charts: query timeline, slowest queries, most-accessed tables. Updates as you work.', tag: 'Analytics', accent: '#fbbf24' },
  { icon: '⟡', title: 'Conversational AI', desc: 'Multi-turn chat with full context. Ask follow-ups, drill into results, auto-execute suggestions.', tag: 'Chat', accent: '#c084fc' },
  { icon: '⊞', title: 'Results Charts', desc: 'Numeric columns auto-visualized. Toggle between table and bar/line chart. Export CSV.', tag: 'Visualization', accent: '#22d3ee' },
];

const SQL_LINES = [
  { text: '> "Top customers by lifetime value"', color: 'var(--cmd)', delay: 0 },
  { text: '', color: 'transparent', delay: 300 },
  { text: 'SELECT', color: 'var(--kw)', delay: 600 },
  { text: '  c.name,', color: 'var(--id)', delay: 820 },
  { text: '  c.country,', color: 'var(--id)', delay: 1000 },
  { text: '  SUM(o.total) AS lifetime_value,', color: 'var(--fn)', delay: 1200 },
  { text: '  COUNT(o.id)  AS order_count', color: 'var(--fn)', delay: 1400 },
  { text: 'FROM customers c', color: 'var(--kw2)', delay: 1600 },
  { text: 'JOIN orders o ON c.id = o.customer_id', color: 'var(--kw2)', delay: 1820 },
  { text: 'GROUP BY c.name, c.country', color: 'var(--kw)', delay: 2060 },
  { text: 'ORDER BY lifetime_value DESC', color: 'var(--kw)', delay: 2280 },
  { text: 'LIMIT 10;', color: 'var(--kw)', delay: 2500 },
  { text: '', color: 'transparent', delay: 2700 },
  { text: '✓ 10 rows · 3ms · 97% confidence', color: 'var(--ok)', delay: 2900 },
];

function TypewriterSQL({ dark }) {
  const [visible, setVisible] = useState(0);
  const [cycling, setCycling] = useState(false);

  useEffect(() => {
    if (cycling) return;
    if (visible < SQL_LINES.length) {
      const delay = SQL_LINES[visible].delay - (visible > 0 ? SQL_LINES[visible - 1].delay : 0);
      const t = setTimeout(() => setVisible(v => v + 1), Math.max(delay, 80));
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setVisible(0); setCycling(false); }, 4200);
    return () => clearTimeout(t);
  }, [visible, cycling]);

  const bg = dark ? '#0a0e1a' : '#f8faff';
  const border = dark ? '#1e2d4a' : '#dde6f5';
  const dotColors = ['#ff5f57', '#febc2e', '#28c840'];

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 16,
      padding: '18px 22px', fontFamily: '"JetBrains Mono","Fira Code",monospace',
      fontSize: 12.5, lineHeight: 1.9, minHeight: 300, position: 'relative',
      style: `
        --kw: #c084fc; --kw2: #38bdf8; --fn: #fbbf24;
        --id: ${dark ? '#e2e8f0' : '#1e293b'}; --cmd: #818cf8;
        --ok: #4ade80;
      `
    }}>
      <style>{`
        .sql-vars {
          --kw: #c084fc; --kw2: #38bdf8; --fn: #fbbf24;
          --id: ${dark ? '#e2e8f0' : '#334155'}; --cmd: #818cf8; --ok: #4ade80;
        }
      `}</style>
      <div className="sql-vars" style={{ position: 'absolute', inset: 0, padding: '18px 22px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {dotColors.map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          <span style={{ marginLeft: 8, fontSize: 10, color: dark ? '#334155' : '#94a3b8', letterSpacing: '.05em' }}>querymind — ai_engine</span>
        </div>
        {SQL_LINES.slice(0, visible).map((line, i) => (
          <div key={i} style={{ color: line.color, minHeight: '1lh', transition: 'opacity .2s', opacity: 1 }}>
            {line.text || '\u00A0'}
          </div>
        ))}
        {visible < SQL_LINES.length && (
          <span style={{ display: 'inline-block', width: 7, height: 13, background: '#818cf8', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
        )}
      </div>
    </div>
  );
}

function GridBg({ dark }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: dark ? 0.035 : 0.055 }}>
        <defs>
          <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke={dark ? '#818cf8' : '#6366f1'} strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Gradient orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: dark ? 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', top: '30%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: dark ? 'radial-gradient(circle, rgba(168,85,247,.1) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(168,85,247,.06) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '30%', width: 700, height: 400, borderRadius: '50%', background: dark ? 'radial-gradient(circle, rgba(34,211,238,.07) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(34,211,238,.05) 0%, transparent 65%)' }} />
    </div>
  );
}

export default function HomePage({ onLaunchApp }) {
  const [dark, setDark] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navScrolled = scrollY > 60;

  // Theme tokens
  const T = {
    bg:        dark ? '#050914' : '#f4f7ff',
    bgCard:    dark ? '#0a0e1a' : '#ffffff',
    bgNav:     dark ? 'rgba(5,9,20,.88)' : 'rgba(244,247,255,.9)',
    border:    dark ? '#1a2236' : '#e2e9f5',
    borderHov: dark ? '#3730a3' : '#a5b4fc',
    text:      dark ? '#e2e8f0' : '#0f172a',
    textSub:   dark ? '#64748b' : '#64748b',
    textMuted: dark ? '#334155' : '#94a3b8',
    accent1:   '#6366f1',
    accent2:   '#a78bfa',
    accent3:   '#22d3ee',
    glow1:     dark ? 'rgba(99,102,241,.22)' : 'rgba(99,102,241,.12)',
    glow2:     dark ? 'rgba(167,139,250,.18)' : 'rgba(167,139,250,.1)',
    tagBg:     dark ? 'rgba(99,102,241,.12)' : 'rgba(99,102,241,.08)',
    tagText:   dark ? '#818cf8' : '#4f46e5',
    pill:      dark ? 'rgba(99,102,241,.1)' : 'rgba(99,102,241,.08)',
    pillBord:  dark ? 'rgba(99,102,241,.25)' : 'rgba(99,102,241,.2)',
    statBg:    dark ? '#080c18' : '#eef1fd',
    inpBg:     dark ? '#0a0e1a' : '#ffffff',
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Space Grotesk', sans-serif; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: ${T.accent1}; border-radius: 3px; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes float1 { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
    @keyframes float2 { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-7px) rotate(-1deg)} }
    @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes pulseRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
    @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
    .anim-up { animation: slideUp .7s cubic-bezier(.22,1,.36,1) both; }
    .anim-up-2 { animation: slideUp .7s cubic-bezier(.22,1,.36,1) .15s both; }
    .anim-up-3 { animation: slideUp .7s cubic-bezier(.22,1,.36,1) .28s both; }
    .anim-up-4 { animation: slideUp .7s cubic-bezier(.22,1,.36,1) .42s both; }
    .hero-cta { display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:12px;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.01em;transition:all .22s cubic-bezier(.22,1,.36,1); border:none; }
    .btn-primary { background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 0 32px ${T.glow1}; }
    .btn-primary:hover { transform:translateY(-2px) scale(1.02);box-shadow:0 8px 40px ${T.glow1},0 0 0 1px #818cf8; }
    .btn-ghost { background:${T.bgCard};color:${T.text};border:1px solid ${T.border}; }
    .btn-ghost:hover { border-color:${T.borderHov};transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.15); }
    .nav-link { font-size:13.5px;font-weight:500;color:${T.textSub};cursor:pointer;transition:color .15s;text-decoration:none;letter-spacing:-.01em; }
    .nav-link:hover { color:${T.text}; }
    .feat-card { background:${T.bgCard};border:1px solid ${T.border};border-radius:18px;padding:24px;transition:all .28s cubic-bezier(.22,1,.36,1);cursor:default;position:relative;overflow:hidden; }
    .feat-card::before { content:'';position:absolute;inset:0;opacity:0;transition:opacity .3s;border-radius:18px;background:radial-gradient(circle at 50% 0%, rgba(99,102,241,.08), transparent 70%); }
    .feat-card:hover { border-color:${T.borderHov};transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.25),0 0 0 1px rgba(99,102,241,.15); }
    .feat-card:hover::before { opacity:1; }
    .step-card { background:${T.bgCard};border:1px solid ${T.border};border-radius:18px;padding:28px 24px;transition:all .25s; }
    .step-card:hover { border-color:${T.borderHov};box-shadow:0 12px 40px rgba(0,0,0,.2); }
    .toggle-btn { display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:1px solid ${T.border};background:${T.bgCard};cursor:pointer;font-size:17px;transition:all .2s;color:${T.text}; }
    .toggle-btn:hover { border-color:${T.accent1};box-shadow:0 0 16px ${T.glow1}; }
    .shimmer-text { background: linear-gradient(90deg, ${T.accent1}, ${T.accent2}, ${T.accent3}, ${T.accent1}); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 4s linear infinite; }
    .badge { display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase; }
    .db-dot { width:8px;height:8px;border-radius:50%;display:inline-block;position:relative; }
    .db-dot::after { content:'';position:absolute;inset:0;border-radius:50%;animation:pulseRing 1.8s ease-out infinite; }
  `;

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Space Grotesk', sans-serif", transition: 'background .3s, color .3s' }}>
      <style>{css}</style>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 60, padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navScrolled ? T.bgNav : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px) saturate(1.8)' : 'none',
        borderBottom: navScrolled ? `1px solid ${T.border}` : 'none',
        transition: 'all .35s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#6366f1,#4338ca)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: `0 0 18px ${T.glow1}`,
          }}>🧠</div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.03em', fontFamily: "'Outfit',sans-serif" }}>
            Query<span style={{ color: '#818cf8' }}>Mind</span>
            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 7px', background: T.tagBg, color: T.tagText, borderRadius: 4, letterSpacing: '.1em', verticalAlign: 'middle', border: `1px solid ${T.pillBord}` }}>PRO</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
          {[['Features', '#features'], ['How It Works', '#howitworks'], ['Stack', '#stack'], ['About', '#about']].map(([l, h]) => (
            <a key={l} className="nav-link" href={h}>{l}</a>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="toggle-btn" onClick={() => setDark(d => !d)} title="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
          <button className="hero-cta btn-ghost" onClick={onLaunchApp} style={{ padding: '8px 18px', fontSize: 13 }}>
            Live Demo
          </button>
          <button className="hero-cta btn-primary" onClick={onLaunchApp} style={{ padding: '8px 20px', fontSize: 13 }}>
            Launch App →
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px 48px 60px', position: 'relative', overflow: 'hidden' }}>
        <GridBg dark={dark} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 64, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left */}
          <div>
            <div className="anim-up">
              <div className="badge" style={{ background: T.pill, border: `1px solid ${T.pillBord}`, color: T.tagText, marginBottom: 24 }}>
                <span className="db-dot" style={{ background: '#4ade80' }}><span style={{ background: 'rgba(74,222,128,.35)' }} /></span>
                AI-Powered · Free · Open Source
              </div>
            </div>

            <div className="anim-up-2">
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(38px,4.8vw,68px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-.04em', marginBottom: 20 }}>
                <span className="shimmer-text">Query your data</span><br />
                <span style={{ color: T.text }}>in plain English.</span>
              </h1>
              <p style={{ fontSize: 17, color: T.textSub, lineHeight: 1.75, marginBottom: 32, maxWidth: 460, fontWeight: 400 }}>
                Connect any database. Write SQL with AI. Watch execution unfold stage-by-stage. Detect anomalies automatically — all in one dark, fast, developer-friendly dashboard.
              </p>
            </div>

            <div className="anim-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <button className="hero-cta btn-primary" onClick={onLaunchApp}>
                <span>Launch QueryMind</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
              <button className="hero-cta btn-ghost" onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore features ↓
              </button>
            </div>

            <div className="anim-up-4" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[['🔌', 'MySQL · PG · SQLite'], ['⚡', 'Groq LLaMA 3.3 70B'], ['🆓', 'Completely Free'], ['🔓', 'Open Source']].map(([ic, lb]) => (
                <span key={lb} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textMuted, fontWeight: 500 }}>
                  <span>{ic}</span>{lb}
                </span>
              ))}
            </div>
          </div>

          {/* Right — terminal */}
          <div style={{ animation: 'float1 6s ease-in-out infinite', position: 'relative' }}>
            {/* Glow ring */}
            <div style={{ position: 'absolute', inset: -2, borderRadius: 18, background: `linear-gradient(135deg, ${T.accent1}28, ${T.accent2}14, transparent)`, zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <TypewriterSQL dark={dark} />
            </div>
            {/* Floating badges */}
            <div style={{ position: 'absolute', top: -16, right: -16, zIndex: 2, animation: 'float2 4s ease-in-out infinite' }}>
              <div style={{ background: T.bgCard, border: `1px solid #16a34a`, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#4ade80', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.3)', backdropFilter: 'blur(8px)' }}>
                ✓ 10 rows · 3ms
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: -16, left: -16, zIndex: 2, animation: 'float1 5s ease-in-out 1.2s infinite' }}>
              <div style={{ background: T.bgCard, border: `1px solid ${T.accent1}`, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#818cf8', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.3)', backdropFilter: 'blur(8px)' }}>
                🧠 97% confidence
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: .4 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: T.textSub }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${T.accent1}, transparent)` }} />
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ background: T.statBg, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            ['13', 'Feature Modules', T.accent1],
            ['3', 'Database Engines', '#4ade80'],
            ['8', 'Simulator Stages', '#fbbf24'],
            ['100%', 'Free & Open Source', T.accent2],
          ].map(([n, l, c], i) => (
            <div key={l} style={{ padding: '28px 24px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 38, fontWeight: 900, color: c, lineHeight: 1, letterSpacing: '-.04em', marginBottom: 5 }}>{n}</div>
              <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, letterSpacing: '.03em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 60, textAlign: 'center' }}>
            <div className="badge" style={{ background: T.pill, border: `1px solid ${T.pillBord}`, color: T.tagText, marginBottom: 16 }}>Capabilities</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 48, fontWeight: 900, letterSpacing: '-.04em', marginBottom: 14 }}>
              <span className="shimmer-text">Everything in one place</span>
            </h2>
            <p style={{ fontSize: 16, color: T.textSub, maxWidth: 420, margin: '0 auto' }}>
              Twelve production-grade features built into a single, fast, cohesive tool.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feat-card"
                onMouseEnter={() => setActiveFeature(i)}
                onMouseLeave={() => setActiveFeature(null)}
                style={{ borderColor: activeFeature === i ? f.accent + '55' : T.border }}>
                {/* Accent top bar on hover */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${f.accent}, transparent)`, borderRadius: '18px 18px 0 0', opacity: activeFeature === i ? 1 : 0, transition: 'opacity .3s' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: f.accent + '15', border: `1px solid ${f.accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: f.accent, fontFamily: 'monospace', fontWeight: 700,
                    transition: 'all .25s',
                    boxShadow: activeFeature === i ? `0 0 20px ${f.accent}30` : 'none',
                  }}>{f.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: f.accent + '12', color: f.accent, letterSpacing: '.06em', textTransform: 'uppercase', border: `1px solid ${f.accent}20` }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: T.text, letterSpacing: '-.02em' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="howitworks" style={{ padding: '100px 48px', background: dark ? 'linear-gradient(180deg,#050914 0%,#070c1e 50%,#050914 100%)' : 'linear-gradient(180deg,#f4f7ff 0%,#edf0ff 50%,#f4f7ff 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 60, textAlign: 'center' }}>
            <div className="badge" style={{ background: T.pill, border: `1px solid ${T.pillBord}`, color: T.tagText, marginBottom: 16 }}>Workflow</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 48, fontWeight: 900, letterSpacing: '-.04em' }}>
              Up and running in <span className="shimmer-text">4 steps</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 52, left: '13%', right: '13%', height: 1, background: `linear-gradient(90deg, transparent, ${T.accent1}55, ${T.accent2}55, transparent)`, zIndex: 0 }} />

            {[
              { n: '01', icon: '🔌', title: 'Connect', desc: 'Enter database credentials. QueryMind loads your full schema — tables, columns, FK relationships — instantly.', color: '#38bdf8' },
              { n: '02', icon: '✨', title: 'Ask', desc: 'Type any question in English. AI generates SQL in your dialect with explanation and confidence score.', color: '#a78bfa' },
              { n: '03', icon: '▶', title: 'Execute', desc: 'Ctrl+Enter to run. See results as table or chart. Export CSV. EXPLAIN plan. All in one panel.', color: '#4ade80' },
              { n: '04', icon: '⚡', title: 'Optimize', desc: 'Simulate 8-stage execution. Let AI rewrite slow queries and detect data quality issues automatically.', color: '#fb923c' },
            ].map((s, i) => (
              <div key={i} className="step-card" style={{ zIndex: 1, position: 'relative' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: '.08em', marginBottom: 14 }}>{s.n}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16, boxShadow: `0 0 20px ${s.color}20` }}>{s.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: T.text, letterSpacing: '-.02em' }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: T.textSub, lineHeight: 1.7 }}>{s.desc}</p>
                {/* Step accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)`, borderRadius: '18px 18px 0 0' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────────── */}
      <section id="stack" style={{ padding: '90px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div className="badge" style={{ background: T.pill, border: `1px solid ${T.pillBord}`, color: T.tagText, marginBottom: 16 }}>Technology</div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 44, fontWeight: 900, letterSpacing: '-.04em', marginBottom: 12 }}>
            Built on <span className="shimmer-text">proven tech</span>
          </h2>
          <p style={{ fontSize: 15.5, color: T.textSub, maxWidth: 380, margin: '0 auto 44px' }}>
            Modern stack chosen for speed, reliability, and developer experience.
          </p>

          {/* Stack grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 900, margin: '0 auto' }}>
            {[
              { name: 'React 18', role: 'Frontend', icon: '⚛', color: '#61dafb' },
              { name: 'Vite', role: 'Build Tool', icon: '⚡', color: '#fbbf24' },
              { name: 'CodeMirror 6', role: 'SQL Editor', icon: '⌨️', color: '#818cf8' },
              { name: 'Recharts', role: 'Visualization', icon: '📈', color: '#4ade80' },
              { name: 'Node.js', role: 'Runtime', icon: '🟢', color: '#4ade80' },
              { name: 'Express', role: 'API Server', icon: '⚡', color: '#94a3b8' },
              { name: 'Groq API', role: 'AI Inference', icon: '🧠', color: '#f97316' },
              { name: 'LLaMA 3.3 70B', role: 'AI Model', icon: '🦙', color: '#a78bfa' },
              { name: 'MySQL', role: 'Database', icon: '🐬', color: '#38bdf8' },
              { name: 'PostgreSQL', role: 'Database', icon: '🐘', color: '#60a5fa' },
              { name: 'SQLite', role: 'Database', icon: '💿', color: '#94a3b8' },
              { name: 'React Context', role: 'State', icon: '🔄', color: '#c084fc' },
            ].map(({ name, role, icon, color }) => (
              <div key={name} style={{
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: '16px 14px', textAlign: 'left',
                transition: 'all .22s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '55'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,.2),0 0 20px ${color}15`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 3, letterSpacing: '-.01em' }}>{name}</div>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <section id="about" style={{ padding: '90px 48px', background: dark ? '#070c1e' : '#edf0ff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div className="badge" style={{ background: T.pill, border: `1px solid ${T.pillBord}`, color: T.tagText, marginBottom: 20 }}>The Project</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 46, fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 22 }}>
              Databases made<br /><span className="shimmer-text">accessible to all.</span>
            </h2>
            <p style={{ fontSize: 15.5, color: T.textSub, lineHeight: 1.8, marginBottom: 16 }}>
              QueryMind Pro solves a real pain: databases require expertise in schema design, SQL dialects, and query optimization that most developers don't have on day one.
            </p>
            <p style={{ fontSize: 15.5, color: T.textSub, lineHeight: 1.8, marginBottom: 30 }}>
              We combined an AI assistant, professional SQL editor, interactive query simulator, and smart data quality tools into one open-source platform — with zero vendor lock-in.
            </p>
            <button className="hero-cta btn-primary" onClick={onLaunchApp}>
              Try it now — it's free →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🎯', title: 'Problem-first design', desc: 'Every single feature solves a real pain point, not a checkbox.', color: '#f472b6' },
              { icon: '🧠', title: 'AI that adapts', desc: 'In-session feedback improves NLP accuracy for your specific schema.', color: '#a78bfa' },
              { icon: '🔬', title: 'Education through visualization', desc: 'The simulator teaches how databases actually work, stage by stage.', color: '#38bdf8' },
              { icon: '🔓', title: 'Fully open', desc: 'All code on GitHub. Self-host, fork, or contribute back freely.', color: '#4ade80' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} style={{
                display: 'flex', gap: 14, padding: '16px 18px',
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 14, transition: 'all .22s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '44'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ''; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '15', border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: `0 0 16px ${color}20` }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: T.text, letterSpacing: '-.01em' }}>{title}</div>
                  <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '110px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <GridBg dark={dark} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#6366f1,#4338ca)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 24px',
            boxShadow: `0 0 48px ${T.glow1}, 0 0 100px ${T.glow2}`,
            animation: 'float1 4s ease-in-out infinite',
          }}>🧠</div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 50, fontWeight: 900, letterSpacing: '-.04em', marginBottom: 16 }}>
            <span className="shimmer-text">Ready to query smarter?</span>
          </h2>
          <p style={{ fontSize: 16.5, color: T.textSub, marginBottom: 36, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 36px' }}>
            Connect your database and start building with AI in minutes. Free, open-source, no credit card required.
          </p>
          <button className="hero-cta btn-primary" onClick={onLaunchApp} style={{ padding: '16px 48px', fontSize: 16 }}>
            Launch QueryMind Pro →
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ padding: '28px 48px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, background: T.statBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🧠</div>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', fontFamily: "'Outfit',sans-serif" }}>
            Query<span style={{ color: '#818cf8' }}>Mind</span> <span style={{ color: T.textMuted, fontWeight: 400 }}>Pro</span>
          </span>
        </div>
        <span style={{ fontSize: 12, color: T.textMuted }}>Powered by Groq · LLaMA 3.3 70B · MIT License</span>
        <div style={{ display: 'flex', gap: 18 }}>
          {['GitHub', 'Documentation', 'MIT License'].map(l => (
            <span key={l} style={{ fontSize: 12.5, color: T.textSub, cursor: 'pointer', transition: 'color .15s', fontWeight: 500 }}
              onMouseEnter={e => e.target.style.color = T.accent1}
              onMouseLeave={e => e.target.style.color = T.textSub}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}