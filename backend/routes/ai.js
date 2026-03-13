// backend/routes/ai.js
// Using Groq API (free, very fast)

const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// We use llama-3.3-70b — free, fast, excellent at SQL
const MODEL = 'llama-3.3-70b-versatile';

// ── Helper: Build system prompt ───────────────────────────────────
function buildSystemPrompt(schema, dialect, feedback) {
  const schemaStr = Object.entries(schema || {}).map(([table, info]) =>
    `Table: ${table}\n` +
    (info.columns || []).map(c =>
      `  - ${c.column_name} (${c.data_type})${c.is_primary_key ? ' PRIMARY KEY' : ''}`
    ).join('\n')
  ).join('\n\n');

  const feedbackStr = feedback && feedback.length > 0
    ? `\nPast user corrections to learn from:\n` +
      feedback.slice(-4).map(f =>
        `  [${f.type}] ${f.note || 'correct'} — query: ${(f.query || '').substring(0, 60)}`
      ).join('\n')
    : '';

  return `You are QueryMind Pro, an expert SQL assistant.

Database schema:
${schemaStr || 'No schema loaded yet.'}

SQL dialect: ${dialect || 'MySQL'}
${feedbackStr}

CRITICAL RULES:
- Return ONLY a valid JSON object
- No markdown, no backticks, no explanation outside JSON
- Use exact table and column names from the schema above

Response formats:
- For NLP to SQL:   {"type":"query","sql":"SELECT ...","explanation":"what this query does","confidence":0.95}
- For schema design: {"type":"schema","tables":[{"name":"table_name","tableType":"fact","columns":[{"name":"col","type":"INT","pk":false,"comment":"desc"}],"comment":"table desc"}],"ddl":"CREATE TABLE ..."}
- For SQL completion: {"type":"completion","completed_sql":"full query here","suggestions":["option 1","option 2"]}`;
}

// ── Helper: Call Groq and parse JSON ──────────────────────────────
async function callGroq(systemPrompt, userMessage) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.1,  // Low temperature = more consistent JSON output
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  });

  const text = completion.choices[0]?.message?.content || '';
  console.log('Groq raw response:', text); // helpful for debugging

  // Clean up — remove markdown fences if model adds them
  const clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find JSON object in response (in case model adds extra text)
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ── POST /api/ai/nlp ──────────────────────────────────────────────
router.post('/nlp', async (req, res) => {
  const { question, dialect, schema, feedback } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, feedback);
    const result = await callGroq(systemPrompt, `Convert to SQL: ${question}`);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Groq NLP error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/ai/design ───────────────────────────────────────────
router.post('/design', async (req, res) => {
  const { description, dialect, schema, feedback } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, feedback);
    const result = await callGroq(systemPrompt, `Design an OLAP database schema for: ${description}`);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Groq Design error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/ai/complete ─────────────────────────────────────────
router.post('/complete', async (req, res) => {
  const { partial_sql, dialect, schema, feedback } = req.body;

  if (!partial_sql || !partial_sql.trim()) {
    return res.status(400).json({ error: 'Partial SQL is required' });
  }

  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, feedback);
    const result = await callGroq(systemPrompt, `Complete this SQL query: ${partial_sql}`);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Groq Complete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ── POST /api/ai/optimize ─────────────────────────────────────────
router.post('/optimize', async (req, res) => {
  const { sql, dialect, schema, explainResult } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL required' });
  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, []);
    const userMsg = `Optimize this SQL query and explain every change you made.
Query: ${sql}
${explainResult ? `EXPLAIN output: ${JSON.stringify(explainResult)}` : ''}
Return ONLY this JSON:
{"type":"optimization","original_sql":"...","optimized_sql":"...","changes":[{"what":"...","why":"..."}],"expected_improvement":"..."}`;
    const result = await callGroq(systemPrompt, userMsg);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { messages, dialect, schema } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Messages required' });
  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, []) + `
You are in conversational mode. Answer questions about the data, generate SQL when asked,
and keep context of the conversation. When you generate SQL wrap it in a JSON block like:
{"sql": "SELECT ..."} on its own line so the frontend can detect and offer to run it.
Otherwise respond naturally in plain text.`;
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });
    const text = completion.choices[0]?.message?.content || '';
    res.json({ success: true, text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/ai/anomaly ──────────────────────────────────────────
router.post('/anomaly', async (req, res) => {
  const { schema, sampleData, dialect } = req.body;
  try {
    const systemPrompt = buildSystemPrompt(schema, dialect, []);
    const userMsg = `Analyze this database schema and sample data for anomalies.
Schema: ${JSON.stringify(schema)}
Sample data: ${JSON.stringify(sampleData)}
Return ONLY this JSON:
{"type":"anomaly_report","issues":[{"table":"...","column":"...","issue_type":"null|duplicate|outlier|broken_fk","severity":"high|medium|low","description":"...","fix_sql":"..."}],"summary":"...","health_score":85}`;
    const result = await callGroq(systemPrompt, userMsg);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;