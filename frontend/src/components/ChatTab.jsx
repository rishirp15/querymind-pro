// frontend/src/components/ChatTab.jsx
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { aiChat, executeSQL } from '../api.js';
import { useApp } from '../store.jsx';

export default function ChatTab() {
  const { schema, dialect, setLastQuery, addToHistory } = useApp();
  const [messages,  setMessages]  = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about your data. I can write and run SQL for you.' }
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      // Send full conversation history to maintain context
      const apiMessages = history
        .filter(m => m.role !== 'assistant' || history.indexOf(m) > 0)
        .map(m => ({ role: m.role, content: m.content }));
      const data = await aiChat(apiMessages, dialect, schema);
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err) {
      toast.error('AI chat failed');
      setMessages(prev => [...prev,
        { role: 'assistant', content: '❌ Error: ' + (err.response?.data?.error || err.message) }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Extract SQL from assistant message if present
  function extractSQL(content) {
    const match = content.match(/\{"sql"\s*:\s*"([\s\S]+?)"\}/);
    return match ? match[1].replace(/\\n/g, '\n') : null;
  }

  async function runSQL(sql) {
    try {
      const data = await executeSQL(sql);
      setLastQuery({ sql, time: data.time, rows: data.rowCount,
        columns: data.columns, results: data.rows?.slice(0, 5) });
      addToHistory({ sql, time: data.time + 'ms',
        rows: data.rowCount, status: 'success' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✓ Executed! ${data.rowCount} rows returned in ${data.time}ms.\n\nPreview:\n${
          data.rows?.slice(0, 3).map(r => JSON.stringify(r)).join('\n') || '(no rows)'
        }`,
        isResult: true,
      }]);
    } catch (err) {
      toast.error('Query failed: ' + (err.response?.data?.error || err.message));
    }
  }

  const SUGGESTIONS = [
    'How many rows are in each table?',
    'Show me the most recent records',
    'Which tables have the most data?',
    'Find any duplicate values',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 96px)' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Suggestions (shown at start) */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8,
            marginTop: 12, marginBottom: 20 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{
                padding: '6px 12px', background: '#0d1117',
                border: '1px solid #1e293b', borderRadius: 20,
                color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => {
          const extractedSQL = msg.role === 'assistant' ? extractSQL(msg.content) : null;
          const displayContent = msg.content.replace(/\{"sql"\s*:.*?\}/g, '').trim();

          return (
            <div key={i} style={{ marginBottom: 16,
              display: 'flex', justifyContent: msg.role === 'user'
                ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#1e1b4b' : '#0d1117',
                border: `1px solid ${msg.role === 'user' ? '#4f46e5' : '#1e293b'}`,
                fontSize: 13, color: '#e2e8f0', lineHeight: 1.6,
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit', fontSize: 13 }}>
                  {displayContent}
                </pre>
                {/* Extracted SQL with run button */}
                {extractedSQL && (
                  <div style={{ marginTop: 10, background: '#07090f',
                    border: '1px solid #1e293b', borderRadius: 8,
                    overflow: 'hidden' }}>
                    <pre style={{ padding: '10px 12px', margin: 0,
                      fontSize: 11, color: '#4ade80', fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap' }}>
                      {extractedSQL}
                    </pre>
                    <div style={{ padding: '6px 10px',
                      borderTop: '1px solid #1e293b' }}>
                      <button onClick={() => runSQL(extractedSQL)} style={{
                        padding: '4px 12px', background: '#052e16',
                        border: '1px solid #16a34a', borderRadius: 6,
                        color: '#4ade80', fontSize: 11, cursor: 'pointer' }}>
                        ▶ Run this query
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px',
            background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 16, width: 'fit-content', marginBottom: 16 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%',
                background: '#4f46e5', opacity: 0.6,
                animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}`}</style>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b',
        background: '#0a0f1e', display: 'flex', gap: 8 }}>
        <input value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); send();
          }}}
          placeholder="Ask anything about your data…"
          style={{ flex: 1, background: '#0d1117',
            border: '1px solid #1e293b', borderRadius: 10,
            color: '#e2e8f0', padding: '10px 14px', fontSize: 13 }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          padding: '10px 20px', background: '#4f46e5',
          border: 'none', borderRadius: 10, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}