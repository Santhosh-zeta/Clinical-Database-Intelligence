// Single source of truth for backend URLs.
// Set NEXT_PUBLIC_API_URL at build time; falls back to localhost for local dev.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const API = `${API_BASE}/api`;
