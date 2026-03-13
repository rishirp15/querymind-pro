require('dotenv').config();
const Database = require('better-sqlite3');

const path = 'R:\\AIRWATCH-FINAL\\aqi\\instance\\airwatch.db';

try {
  const db = new Database(path, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✅ Connected! Tables:', tables.map(t => t.name));
  db.close();
} catch (err) {
  console.log('❌ Error:', err.message);
}