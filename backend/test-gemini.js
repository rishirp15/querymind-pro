require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  console.log('API Key:', process.env.GROQ_API_KEY ? 'Loaded ✓' : 'MISSING ✗');
  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      max_tokens: 10,
    });
    console.log('Response:', result.choices[0].message.content);
    console.log('✅ Groq is working!');
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

test();