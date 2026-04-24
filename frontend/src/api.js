// frontend/src/api.js
// This file contains all functions that call our backend API
// Import this wherever you need to talk to the server
 
import axios from 'axios';
 
// Base URL of our backend server
const BASE = 'http://localhost:3001/api';
 
// ── Axios instance with defaults ────────────────────────────────
const api = axios.create({
  baseURL: BASE,
  timeout: 30000, // 30 seconds timeout (AI can be slow)
  headers: { 'Content-Type': 'application/json' },
});
 
// ── Database functions ───────────────────────────────────────────
 
// Connect to a database
export const connectDB = (config) =>
  api.post('/db/connect', config).then(r => r.data);
 
// Get all tables and columns
export const getSchema = () =>
  api.get('/db/schema').then(r => r.data);
 
// Run a SQL query
export const executeSQL = (sql) =>
  api.post('/db/execute', { sql }).then(r => r.data);
 
// Get list of databases
export const getDatabases = () =>
  api.get('/db/databases').then(r => r.data);
 
// ── AI functions ────────────────────────────────────────────────
 
// Convert English question to SQL
export const nlpToSQL = (question, dialect, schema, feedback) =>
  api.post('/ai/nlp', { question, dialect, schema, feedback }).then(r => r.data);
 
// Design a database schema from description
export const designSchema = (description, dialect, schema, feedback) =>
  api.post('/ai/design', { description, dialect, schema, feedback }).then(r => r.data);
 
// Complete partial SQL
export const completeSQL = (partial_sql, dialect, schema, feedback) =>
  api.post('/ai/complete', { partial_sql, dialect, schema, feedback }).then(r => r.data);

// Add these to the existing api.js file

// Explain a query
export const explainQuery = (sql) =>
  api.post('/db/explain', { sql }).then(r => r.data);

// Get DB stats
export const getDBStats = () =>
  api.get('/db/stats').then(r => r.data);

// Get foreign keys
export const getForeignKeys = () =>
  api.post('/db/foreign-keys', {}).then(r => r.data);

// AI optimize
export const optimizeQuery = (sql, dialect, schema, explainResult) =>
  api.post('/ai/optimize', { sql, dialect, schema, explainResult }).then(r => r.data);

// AI chat
export const aiChat = (messages, dialect, schema) =>
  api.post('/ai/chat', { messages, dialect, schema }).then(r => r.data);

// AI anomaly detection
export const detectAnomalies = (schema, sampleData, dialect) =>
  api.post('/ai/anomaly', { schema, sampleData, dialect }).then(r => r.data);

// ── Query Simulator ─────────────────────────────────────────────
// Full real execution analysis (plan + index + join comparison + algorithm comparison)
// BUG FIX: use 120s timeout — full analysis runs 10+ DB round-trips
export const simulateQuery = (sql) =>
  api.post('/simulator/analyze', { sql }, { timeout: 120000 }).then(r => r.data);

// Quick explain only
export const explainQueryPlan = (sql) =>
  api.post('/simulator/explain', { sql }).then(r => r.data);

// Standalone join algorithm comparison (Nested Loop / Hash Join / Merge Sort)
export const compareJoinAlgorithms = (sql) =>
  api.post('/simulator/join-algorithms', { sql }, { timeout: 120000 }).then(r => r.data);
