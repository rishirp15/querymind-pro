// frontend/src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';

const FEATURES = [
  { icon: '🔌', title: 'Universal DB Connect', desc: 'Connect PostgreSQL, MySQL, or SQLite. Live schema loading, multi-database switching.', tag: 'Connection', color: '#3b82f6' },
  { icon: '✨', title: 'NLP → SQL', desc: 'Describe what you want in plain English. AI generates precise SQL for your dialect instantly.', tag: 'AI Core', color: '#8b5cf6' },
  { icon: '⌨️', title: 'Pro SQL Editor', desc: 'Syntax highlighting, multi-tab editing, Ctrl+Enter execution, destructive query guards.', tag: 'Editor', color: '#06b6d4' },
  { icon: '🎬', title: 'Query Simulator', desc: 'Watch SQL come alive — tokenization, parse tree, semantic checks, optimization, execution.', tag: 'Visualization', color: '#f59e0b' },
  { icon: '📊', title: 'Results Charts', desc: 'Auto-detect numeric columns, toggle between table and bar/line chart views instantly.', tag: 'Analytics', color: '#10b981' },
  { icon: '🗄️', title: 'Schema + ER Diagram', desc: 'Cross-table column search. ER Diagram view with real foreign key relationship lines.', tag: 'Schema', color: '#6366f1' },
  { icon: '⚡', title: 'AI Query Optimizer', desc: 'Submit any slow query and receive a rewritten version with full explanation of changes.', tag: 'Optimization', color: '#f97316' },
  { icon: '💬', title: 'Conversational AI', desc: 'Multi-turn chat with full context. Ask follow-ups, drill into results, run queries from chat.', tag: 'Chat', color: '#ec4899' },
  { icon: '🔬', title: 'Anomaly Detection', desc: 'AI health scan for NULLs, duplicates, outliers, broken FKs. Scores and suggests fixes.', tag: 'Quality', color: '#14b8a6' },
  { icon: '📐', title: 'OLAP Designer', desc: 'Describe a business domain. AI generates fact/dimension tables and ready-to-run DDL.', tag: 'Design', color: '#a855f7' },
  { icon: '📈', title: 'Performance Dashboard', desc: 'Live stats: query counts, execution times, slowest queries, most-accessed tables.', tag: 'Monitoring', color: '#22c55e' },
  { icon: '⭐', title: 'History & Favourites', desc: 'Full query log with timing. Star to pin. Full-text search across all past executions.', tag: 'Productivity', color: '#eab308' },
];

const STEPS = [
  { n: '01', icon: '🔌', title: 'Connect', desc: 'Enter your database credentials. QueryMind loads your full schema in seconds.' },
  { n: '02', icon: '✨', title: 'Ask', desc: 'Type a question in plain English. AI writes the SQL and explains it.' },
  { n: '03', icon: '▶', title: 'Execute', desc: 'Run with Ctrl+Enter. See results as table or chart. Export CSV in one click.' },
  { n: '04', icon: '⚡', title: 'Optimize', desc: 'Simulate execution stages. Let AI rewrite slow queries automatically.' },
];

const SQL_FRAMES = [
  { lines: ['> "Show top customers by revenue"', '', '⠋ Thinking…'], delay: 800 },
  { lines: ['> "Show top customers by revenue"', '', 'SELECT c.name,', '  SUM(o.total) AS revenue', 'FROM customers c', 'JOIN orders o', '  ON c.id = o.customer_id', 'GROUP BY c.name', 'ORDER BY revenue DESC', 'LIMIT 10;'], delay: 2400 },
  { lines: ['> "Show top customers by revenue"', '', 'SELECT c.name,', '  SUM(o.total) AS revenue', 'FROM customers c', 'JOIN orders o', '  ON c.id = o.customer_id', 'GROUP BY c.name', 'ORDER BY revenue DESC', 'LIMIT 10;', '', '✓ 10 rows · 4ms · 98% confidence'], delay: 2200 },
];

function SQLTypewriter() {
  const [frameIdx, setFrameIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const frame = SQL_FRAMES[frameIdx];
  const fullText = frame.lines.join('\n');
  const displayed = fullText.slice(0, charIdx);

  useEffect(() => {
    if (charIdx < fullText.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 18);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const next = (frameIdx + 1) % SQL_FRAMES.length;
      setFrameIdx(next); setCharIdx(0);
    }, frame.delay);
    return () => clearTimeout(t);
  }, [charIdx, frameIdx, fullText, frame.delay]);

  return (
    <div style={{ background: '#07090f', border: '1px solid #1e293b', borderRadius: 14, padding: '20px 24px', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: 12.5, lineHeight: 1.85, minHeight: 260 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, alignItems: 'center' }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <span style={{ marginLeft: 10, fontSize: 11, color: '#334155', letterSpacing: '0.05em' }}>querymind — nlp_to_sql</span>
      </div>
      {displayed.split('\n').map((line, i) => (
        <div key={i} style={{
          color: line.startsWith('>') ? '#818cf8' : line.startsWith('✓') ? '#4ade80' : line.startsWith('⠋') ? '#475569'
            : /^(SELECT|FROM|JOIN|WHERE|GROUP|ORDER|LIMIT|ON)/.test(line.trim()) ? '#c084fc'
            : /c\.|o\./.test(line) ? '#7dd3fc' : /SUM|COUNT|AVG/.test(line) ? '#fbbf24' : '#e2e8f0',
          minHeight: '1em',
        }}>{line || '\u00A0'}</div>
      ))}
      <span style={{ display: 'inline-block', width: 7, height: 14, marginLeft: 1, background: '#818cf8', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let W, H, pts, raf;
    const init = () => {
      W = c.width = c.offsetWidth; H = c.height = c.offsetHeight;
      pts = Array.from({ length: 55 }, () => ({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25, r: Math.random()*1.3+.4 }));
    };
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      for (let i=0;i<pts.length;i++) {
        const p=pts[i]; p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);ctx.fillStyle='rgba(99,102,241,0.38)';ctx.fill();
        for(let j=i+1;j<pts.length;j++){const q=pts[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<110){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(99,102,241,${.1*(1-d/110)})`;ctx.lineWidth=.5;ctx.stroke();}}
      }
      raf=requestAnimationFrame(draw);
    };
    init();draw();
    const ro=new ResizeObserver(init);ro.observe(c);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();};
  },[]);
  return <canvas ref={ref} style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }} />;
}

export default function HomePage({ onLaunchApp }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ background: '#030508', color: '#e2e8f0', minHeight: '100vh', overflowX: 'hidden', fontFamily: '"Syne","Inter",sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:3px;}
        .hp-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.01em;transition:all .18s;}
        .hp-btn-primary{background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;color:#fff;box-shadow:0 0 28px rgba(99,102,241,.28);}
        .hp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 44px rgba(99,102,241,.44);}
        .hp-btn-ghost{background:transparent;border:1px solid #1e293b;color:#94a3b8;}
        .hp-btn-ghost:hover{border-color:#4f46e5;color:#e2e8f0;}
        .hp-nav-a{color:#64748b;font-size:13.5px;font-weight:500;cursor:pointer;transition:color .15s;text-decoration:none;}
        .hp-nav-a:hover{color:#e2e8f0;}
        .glow{background:linear-gradient(135deg,#e2e8f0 20%,#818cf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .card{background:#0a0f1a;border:1px solid #111827;border-radius:14px;transition:all .25s;}
        .card:hover{border-color:#4f46e5;transform:translateY(-3px);box-shadow:0 16px 36px rgba(0,0,0,.5),0 0 24px rgba(99,102,241,.1);}
        .ptag{display:inline-block;padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .u1{animation:up .7s ease both}.u2{animation:up .7s ease .12s both}.u3{animation:up .7s ease .22s both}
      `}</style>

      {/* Nav */}
      <nav style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,padding:'0 48px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',background:scrolled?'rgba(3,5,8,.9)':'transparent',backdropFilter:scrolled?'blur(18px)':'none',borderBottom:scrolled?'1px solid rgba(30,41,59,.5)':'none',transition:'all .3s' }}>
        <div style={{ display:'flex',alignItems:'center',gap:9 }}>
          <div style={{ width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#6366f1,#4338ca)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🧠</div>
          <span style={{ fontSize:16,fontWeight:800,letterSpacing:'-.02em' }}>Query<span style={{ color:'#818cf8' }}>Mind</span><span style={{ marginLeft:6,fontSize:10,fontWeight:700,padding:'2px 6px',background:'rgba(99,102,241,.15)',color:'#818cf8',borderRadius:4,letterSpacing:'.07em',verticalAlign:'middle' }}>PRO</span></span>
        </div>
        <div style={{ display:'flex',gap:26,alignItems:'center' }}>
          {[['Features','#features'],['How it works','#how-it-works'],['About','#about'],['Stack','#tech']].map(([l,h])=><a key={l} className="hp-nav-a" href={h}>{l}</a>)}
        </div>
        <div style={{ display:'flex',gap:9 }}>
          <button className="hp-btn hp-btn-ghost" onClick={onLaunchApp} style={{ padding:'7px 16px',fontSize:13 }}>Demo</button>
          <button className="hp-btn hp-btn-primary" onClick={onLaunchApp} style={{ padding:'7px 18px',fontSize:13 }}>Launch App →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh',display:'flex',alignItems:'center',padding:'88px 48px 56px',position:'relative',overflow:'hidden' }}>
        <Particles />
        <div style={{ position:'absolute',top:'18%',left:'4%',width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,.08) 0%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'12%',right:'6%',width:340,height:340,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ maxWidth:1160,margin:'0 auto',width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center',position:'relative' }}>
          <div>
            <div className="u1">
              <span style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',border:'1px solid rgba(99,102,241,.3)',borderRadius:20,fontSize:11,fontWeight:700,color:'#818cf8',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:22,background:'rgba(99,102,241,.07)' }}>✦ AI-Powered SQL Platform</span>
            </div>
            <div className="u2">
              <h1 style={{ fontSize:'clamp(36px,4.2vw,60px)',fontWeight:800,lineHeight:1.06,letterSpacing:'-.03em',marginBottom:18 }}>
                <span className="glow">Query your data</span><br /><span style={{ color:'#e2e8f0' }}>in plain English.</span>
              </h1>
              <p style={{ fontSize:16,color:'#64748b',lineHeight:1.78,marginBottom:30,maxWidth:450 }}>Connect any database, write SQL with AI, watch execution unfold stage-by-stage, and detect data issues automatically.</p>
              <div style={{ display:'flex',gap:11,flexWrap:'wrap' }}>
                <button className="hp-btn hp-btn-primary" onClick={onLaunchApp}>Launch QueryMind →</button>
                <button className="hp-btn hp-btn-ghost" onClick={()=>document.querySelector('#features')?.scrollIntoView({behavior:'smooth'})}>See all features</button>
              </div>
              <div style={{ display:'flex',gap:18,marginTop:28,flexWrap:'wrap' }}>
                {[['🔓','Open Source'],['⚡','Groq + LLaMA 3.3'],['🗄️','MySQL · PostgreSQL · SQLite'],['🆓','Free']].map(([ic,lb])=>(
                  <span key={lb} style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#475569' }}><span>{ic}</span>{lb}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="u3" style={{ position:'relative' }}>
            <div style={{ position:'absolute',inset:-1,background:'linear-gradient(135deg,rgba(99,102,241,.18),rgba(79,70,229,.08),transparent)',borderRadius:16,zIndex:0 }} />
            <div style={{ position:'relative',zIndex:1 }}><SQLTypewriter /></div>
            <div style={{ position:'absolute',top:-13,right:-13,background:'#0d1117',border:'1px solid #16a34a',borderRadius:9,padding:'7px 12px',fontSize:11.5,color:'#4ade80',fontWeight:700,animation:'floatY 3s ease-in-out infinite',zIndex:2 }}>✓ 10 rows · 4ms</div>
            <div style={{ position:'absolute',bottom:-13,left:-13,background:'#0d1117',border:'1px solid #4f46e5',borderRadius:9,padding:'7px 12px',fontSize:11.5,color:'#818cf8',fontWeight:700,animation:'floatY 3s ease-in-out 1.4s infinite',zIndex:2 }}>🧠 AI confidence 98%</div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ borderTop:'1px solid #0d1117',borderBottom:'1px solid #0d1117',background:'#050810' }}>
        <div style={{ maxWidth:1160,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)' }}>
          {[['12+','Core Features','#818cf8'],['3','DB Engines','#4ade80'],['8','Simulator Stages','#fbbf24'],['100%','Open Source','#a78bfa']].map(([n,l,c],i)=>(
            <div key={l} style={{ padding:'26px 24px',textAlign:'center',borderRight:i<3?'1px solid #0f172a':'none' }}>
              <div style={{ fontSize:34,fontWeight:800,color:c,lineHeight:1.1 }}>{n}</div>
              <div style={{ fontSize:11.5,color:'#475569',marginTop:5,letterSpacing:'.05em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding:'92px 48px' }}>
        <div style={{ maxWidth:1160,margin:'0 auto' }}>
          <div style={{ marginBottom:52,textAlign:'center' }}>
            <span className="ptag" style={{ background:'rgba(99,102,241,.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',marginBottom:13,display:'inline-block' }}>Features</span>
            <h2 style={{ fontSize:40,fontWeight:800,letterSpacing:'-.02em',marginBottom:11 }}><span className="glow">Everything in one place</span></h2>
            <p style={{ fontSize:15.5,color:'#64748b',maxWidth:460,margin:'0 auto' }}>Twelve production-grade features built into a single cohesive tool.</p>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:13 }}>
            {FEATURES.map((f,i)=>(
              <div key={i} className="card" style={{ padding:'22px 20px' }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
                  <div style={{ width:38,height:38,borderRadius:9,background:f.color+'18',border:`1px solid ${f.color}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17 }}>{f.icon}</div>
                  <span className="ptag" style={{ background:f.color+'14',color:f.color,border:`1px solid ${f.color}22`,marginTop:3 }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize:14,fontWeight:700,marginBottom:7,color:'#e2e8f0' }}>{f.title}</h3>
                <p style={{ fontSize:12.5,color:'#64748b',lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding:'92px 48px',background:'linear-gradient(180deg,#030508 0%,#050810 50%,#030508 100%)' }}>
        <div style={{ maxWidth:1160,margin:'0 auto' }}>
          <div style={{ marginBottom:52,textAlign:'center' }}>
            <span className="ptag" style={{ background:'rgba(99,102,241,.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',marginBottom:13,display:'inline-block' }}>Quick Start</span>
            <h2 style={{ fontSize:40,fontWeight:800,letterSpacing:'-.02em' }}><span className="glow">Running in 4 steps</span></h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,position:'relative' }}>
            <div style={{ position:'absolute',top:44,left:'12%',right:'12%',height:1,background:'linear-gradient(90deg,transparent,#1e293b,#4f46e5,#1e293b,transparent)',zIndex:0 }} />
            {STEPS.map((s,i)=>(
              <div key={i} className="card" style={{ padding:'26px 20px',zIndex:1 }}>
                <div style={{ fontSize:11,fontFamily:'"JetBrains Mono",monospace',color:'#334155',fontWeight:700,letterSpacing:'.06em',marginBottom:12 }}>{s.n}</div>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,marginBottom:13 }}>{s.icon}</div>
                <h3 style={{ fontSize:15,fontWeight:700,marginBottom:7,color:'#e2e8f0' }}>{s.title}</h3>
                <p style={{ fontSize:13,color:'#64748b',lineHeight:1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ padding:'92px 48px' }}>
        <div style={{ maxWidth:1160,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:68,alignItems:'center' }}>
          <div>
            <span className="ptag" style={{ background:'rgba(99,102,241,.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',marginBottom:16,display:'inline-block' }}>The Project</span>
            <h2 style={{ fontSize:40,fontWeight:800,letterSpacing:'-.02em',lineHeight:1.1,marginBottom:20 }}><span className="glow">Databases, made</span><br /><span style={{ color:'#e2e8f0' }}>accessible to all</span></h2>
            <p style={{ fontSize:15,color:'#64748b',lineHeight:1.8,marginBottom:16 }}>QueryMind Pro solves a real pain: databases require expertise in schema design, SQL dialects, and optimization that most developers don't have on day one.</p>
            <p style={{ fontSize:15,color:'#64748b',lineHeight:1.8,marginBottom:26 }}>We combined an AI assistant, professional SQL editor, interactive query simulator, and smart data quality tools into one open-source platform.</p>
            <button className="hp-btn hp-btn-primary" onClick={onLaunchApp}>Try it now →</button>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:11 }}>
            {[['🎯','Problem-first','Every feature solves a real pain point, not a checkbox.'],['🧠','AI that learns','Feedback captured in-session improves future suggestions.'],['🔬','Education first','The simulator teaches how databases work, stage by stage.'],['🔓','Fully open','All code on GitHub. Self-host, extend, or contribute back.']].map(([ic,t,d])=>(
              <div key={t} className="card" style={{ display:'flex',gap:13,padding:'15px' }}>
                <div style={{ width:36,height:36,borderRadius:8,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.16)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>{ic}</div>
                <div>
                  <div style={{ fontSize:13.5,fontWeight:700,marginBottom:3,color:'#e2e8f0' }}>{t}</div>
                  <div style={{ fontSize:12.5,color:'#64748b',lineHeight:1.6 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="tech" style={{ padding:'76px 48px',background:'#050810' }}>
        <div style={{ maxWidth:1160,margin:'0 auto',textAlign:'center' }}>
          <span className="ptag" style={{ background:'rgba(99,102,241,.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',marginBottom:14,display:'inline-block' }}>Stack</span>
          <h2 style={{ fontSize:36,fontWeight:800,letterSpacing:'-.02em',marginBottom:9 }}><span className="glow">Built on proven technology</span></h2>
          <p style={{ fontSize:15,color:'#64748b',maxWidth:400,margin:'0 auto 36px' }}>Modern stack chosen for speed, reliability, and developer experience.</p>
          <div style={{ display:'flex',flexWrap:'wrap',gap:9,justifyContent:'center' }}>
            {[['React 19','Frontend'],['Vite','Build'],['CodeMirror','Editor'],['Recharts','Charts'],['Express.js','API'],['Groq','AI'],['LLaMA 3.3 70B','Model'],['MySQL','DB'],['PostgreSQL','DB'],['SQLite','DB'],['Node.js','Runtime']].map(([n,r])=>(
              <div key={n} className="card" style={{ padding:'8px 15px',cursor:'default' }}>
                <span style={{ fontSize:13,fontWeight:700,color:'#94a3b8' }}>{n}</span>
                <span style={{ fontSize:11,color:'#334155',marginLeft:7 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'92px 48px',textAlign:'center' }}>
        <div style={{ maxWidth:520,margin:'0 auto' }}>
          <div style={{ width:56,height:56,borderRadius:14,background:'linear-gradient(135deg,#6366f1,#4338ca)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 20px',boxShadow:'0 0 36px rgba(99,102,241,.32)' }}>🧠</div>
          <h2 style={{ fontSize:38,fontWeight:800,letterSpacing:'-.02em',marginBottom:12 }}><span className="glow">Ready to query smarter?</span></h2>
          <p style={{ fontSize:15.5,color:'#64748b',marginBottom:30,lineHeight:1.75 }}>Connect your database and start building with AI in minutes. Free, open-source, and production-ready.</p>
          <button className="hp-btn hp-btn-primary" onClick={onLaunchApp} style={{ padding:'14px 42px',fontSize:15 }}>Launch QueryMind Pro →</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'26px 48px',borderTop:'1px solid #0d1117',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:13 }}>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}>
          <div style={{ width:20,height:20,borderRadius:5,background:'linear-gradient(135deg,#6366f1,#4338ca)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10 }}>🧠</div>
          <span style={{ fontSize:13,fontWeight:700,color:'#64748b' }}>QueryMind <span style={{ color:'#6366f1' }}>Pro</span></span>
        </div>
        <span style={{ fontSize:11.5,color:'#1e293b' }}>Powered by Groq · LLaMA 3.3 70B · Open Source</span>
        <div style={{ display:'flex',gap:16 }}>
          {['GitHub','Docs','MIT License'].map(l=>(
            <span key={l} style={{ fontSize:12,color:'#334155',cursor:'pointer',transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='#818cf8'}
              onMouseLeave={e=>e.target.style.color='#334155'}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}