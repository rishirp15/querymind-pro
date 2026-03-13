// frontend/src/components/DesignerTab.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { designSchema } from '../api.js';
import { useApp } from '../store.jsx';
 
const DEMOS = [
  'E-commerce platform: orders, customers, products, campaigns, inventory',
  'SaaS company: users, events, subscriptions, features, billing',
  'Healthcare: patients, appointments, diagnoses, prescriptions',
];
 
export default function DesignerTab() {
  const { schema: connSchema, dialect, feedback } = useApp();
  const [desc,    setDesc]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [selTable,setSelTable]= useState(null);
 
  async function generate() {
    if (!desc.trim()) return;
    setLoading(true);
    try {
      const data = await designSchema(desc, dialect, connSchema, feedback);
      setResult(data.result);
      setSelTable(data.result?.tables?.[0]?.name || null);
      toast.success('Schema designed!');
    } catch (err) {
      toast.error('Design failed — check your API key');
    } finally {
      setLoading(false);
    }
  }
 
  const selectedTable = result?.tables?.find(t => t.name === selTable);
 
  return (
    <div style={{ display:'flex', height:'calc(100vh - 96px)' }}>
      {/* Left */}
      <div style={{ width:300, borderRight:'1px solid #1e293b',
        padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <h3 style={{ fontSize:14, fontWeight:700 }}>📐 Schema Designer</h3>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)}
          placeholder="Describe your system in plain English…" rows={6}
          style={{ background:'#07090f', border:'1px solid #1e293b', borderRadius:8,
            color:'#e2e8f0', padding:10, fontSize:13, resize:'none',
            fontFamily:'sans-serif', lineHeight:1.6 }}
        />
        <button onClick={generate} disabled={loading||!desc.trim()} style={{
          padding:10, background:'#4f46e5', border:'none', borderRadius:8,
          color:'#fff', fontSize:13, fontWeight:700 }}>
          {loading ? '⏳ Designing…' : '✨ Design Schema'}
        </button>
        <div style={{ fontSize:11, color:'#475569', letterSpacing:'0.07em' }}>EXAMPLES</div>
        {DEMOS.map((d,i)=>(
          <button key={i} onClick={()=>setDesc(d)} style={{
            textAlign:'left', background:'#0d1117', border:'1px solid #1e293b',
            borderRadius:7, padding:'8px 10px', color:'#64748b', fontSize:11,
            lineHeight:1.5 }}>
            {d}
          </button>
        ))}
      </div>
      {/* Right */}
      <div style={{ flex:1, overflowY:'auto', padding:20 }}>
        {result ? (
          <>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Generated Schema</h3>
            <p style={{ color:'#64748b', fontSize:12, marginBottom:16 }}>
              {result.tables?.length} tables ·{' '}
              {result.tables?.filter(t=>t.tableType==='fact').length} fact ·{' '}
              {result.tables?.filter(t=>t.tableType==='dimension').length} dimension
            </p>
            {/* Table cards */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
              {result.tables?.map(t=>(
                <div key={t.name} onClick={()=>setSelTable(t.name)} style={{
                  padding:'10px 14px', cursor:'pointer', minWidth:130,
                  background: t.tableType==='fact' ? '#1c1400' : '#0c0a2a',
                  border: `1px solid ${selTable===t.name
                    ? (t.tableType==='fact' ? '#f59e0b' : '#6366f1')
                    : '#1e293b'}`,
                  borderRadius:8 }}>
                  <div style={{ fontSize:10, color: t.tableType==='fact' ? '#f59e0b' : '#818cf8',
                    marginBottom:4 }}>{t.tableType?.toUpperCase()}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{t.columns?.length} cols</div>
                </div>
              ))}
            </div>
            {/* Selected table columns */}
            {selectedTable && (
              <div style={{ background:'#0d1117', border:'1px solid #1e293b',
                borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                <div style={{ padding:'9px 14px', background:'#0f172a',
                  fontSize:13, fontWeight:600 }}>
                  {selectedTable.name} — {selectedTable.comment}
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#07090f' }}>
                    {['Column','Type','Description'].map(h=>(
                      <th key={h} style={{ padding:'7px 12px', textAlign:'left',
                        fontSize:10, color:'#475569', borderBottom:'1px solid #1e293b' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selectedTable.columns?.map((col,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #0f172a' }}>
                        <td style={{ padding:'7px 12px', fontSize:12,
                          color: col.pk ? '#818cf8' : '#e2e8f0',
                          fontFamily:'monospace' }}>{col.name}</td>
                        <td style={{ padding:'7px 12px', fontSize:11,
                          color:'#f59e0b', fontFamily:'monospace' }}>{col.type}</td>
                        <td style={{ padding:'7px 12px', fontSize:11,
                          color:'#64748b' }}>{col.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.ddl && (
              <details>
                <summary style={{ cursor:'pointer', fontSize:12, color:'#64748b',
                  padding:'8px 0', userSelect:'none' }}>📄 View DDL Statements</summary>
                <pre style={{ background:'#07090f', borderRadius:8, padding:14,
                  fontSize:11, color:'#94a3b8', overflow:'auto',
                  maxHeight:280, border:'1px solid #1e293b', marginTop:8 }}>
                  {result.ddl}
                </pre>
              </details>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', paddingTop:80, color:'#475569' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📐</div>
            <p>Describe a business system to generate an OLAP schema</p>
          </div>
        )}
      </div>
    </div>
  );
}
