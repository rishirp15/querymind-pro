// frontend/src/components/ConnectTab.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { connectDB, getSchema } from '../api.js';
import { useApp } from '../store.jsx';
 
// Engine options with their default ports
const ENGINES = [
  { id: 'postgresql', label: 'PostgreSQL', icon: '🐘', port: '5432' },
  { id: 'mysql',      label: 'MySQL',      icon: '🐬', port: '3306' },
  { id: 'sqlite',     label: 'SQLite',     icon: '📁', port: ''     },
];
 
export default function ConnectTab() {
  const { connected, setConnected, setDbConfig, setSchema, setDialect } = useApp();
 
  // Form state
  const [engine,   setEngine]   = useState('postgresql');
  const [host,     setHost]     = useState('localhost');
  const [port,     setPort]     = useState('5432');
  const [user,     setUser]     = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [filepath, setFilepath] = useState('');
  const [loading,  setLoading]  = useState(false);
 
  // Dialect labels matching the selector options in App.jsx
  const ENGINE_TO_DIALECT = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite' };

  // When user picks an engine, update the default port AND sync the AI dialect
  function handleEngineChange(eng) {
    setEngine(eng.id);
    setPort(eng.port);
    if (ENGINE_TO_DIALECT[eng.id]) setDialect(ENGINE_TO_DIALECT[eng.id]);
  }
 
  // Handle the Connect button click
  async function handleConnect() {
    setLoading(true);
    try {
      const config = { engine, host, port, user, password, database, filepath };
      await connectDB(config);
 
      // After connecting, load the schema
      const schemaResult = await getSchema();
      setSchema(schemaResult.schema || {});
      setConnected(true);
      setDbConfig(config);
      // Sync dialect to match the actual connected engine
      if (ENGINE_TO_DIALECT[engine]) setDialect(ENGINE_TO_DIALECT[engine]);
      toast.success('Connected successfully! Schema loaded.');
    } catch (err) {
      // err.response.data.error comes from our backend error handler
      toast.error(err.response?.data?.error || 'Connection failed');
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        Connect to Database
      </h2>
      <p style={{ color: '#64748b', marginBottom: 28, fontSize: 13 }}>
        Enter your database credentials. The connection stays active for your session.
      </p>
 
      {/* Engine selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {ENGINES.map(eng => (
          <button
            key={eng.id}
            onClick={() => handleEngineChange(eng)}
            style={{
              flex: 1, padding: '12px 8px',
              borderRadius: 10,
              border: engine === eng.id ? '2px solid #6366f1' : '1px solid #1e293b',
              background: engine === eng.id ? '#1e1b4b' : '#0d1117',
              color: engine === eng.id ? '#e2e8f0' : '#64748b',
              fontSize: 12, fontWeight: 600,
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{eng.icon}</div>
            {eng.label}
          </button>
        ))}
      </div>
 
      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {engine === 'sqlite' ? (
          <Field label="FILE PATH" value={filepath} onChange={setFilepath}
            placeholder="/path/to/database.db or :memory:" />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="HOST" value={host} onChange={setHost}
                placeholder="localhost" style={{ flex: 2 }} />
              <Field label="PORT" value={port} onChange={setPort}
                placeholder="5432" style={{ flex: 1 }} />
            </div>
            <Field label="DATABASE NAME" value={database} onChange={setDatabase}
              placeholder="my_database" />
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="USERNAME" value={user} onChange={setUser}
                placeholder="postgres" />
              <Field label="PASSWORD" type="password" value={password}
                onChange={setPassword} placeholder="••••••••" />
            </div>
          </>
        )}
 
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            padding: '12px', marginTop: 8,
            background: '#4f46e5', border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 14, fontWeight: 700,
          }}
        >
          {loading ? '⏳ Connecting…' : connected ? '🔄 Reconnect' : '🔌 Connect'}
        </button>
      </div>
 
      {/* Success message */}
      {connected && (
        <div style={{
          marginTop: 20, padding: '14px 16px',
          background: '#052e16', border: '1px solid #16a34a',
          borderRadius: 10, fontSize: 13, color: '#4ade80',
        }}>
          ✓ Connected! Go to the Schema tab to browse your tables.
        </div>
      )}
    </div>
  );
}
 
// Reusable input field component
function Field({ label, value, onChange, placeholder, type='text', style={} }) {
  return (
    <div style={{ flex: 1, ...style }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block',
        marginBottom: 5, letterSpacing: '0.07em' }}>
        {label}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: '#0d1117',
          border: '1px solid #1e293b', borderRadius: 8,
          color: '#e2e8f0', padding: '9px 12px', fontSize: 13,
        }}
      />
    </div>
  );
}