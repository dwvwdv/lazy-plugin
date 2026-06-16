// ─── Supabase ────────────────────────────────────────────────────────────────
export const SUPABASE_URL    = 'https://pwrwclutauqxbqsqfkjj.supabase.co';
export const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cndjbHV0YXVxeGJxc3Fma2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNjk2OTEsImV4cCI6MjA0OTc0NTY5MX0.vuocg4yRU0Tvx1ylxN9AXRwwifKWDAuyCjaE7wb_KRg';
export const SUPABASE_SCHEMA = 'chat_extractor';   // <- schema 名稱

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_CLIENT_ID = '';

// ─── Default platform extraction rules ───────────────────────────────────────
export const DEFAULT_PLATFORMS = {
  claude: {
    name: 'Claude',
    match: 'https://claude.ai/*',
    selector: "a[href^='/chat/'] .sr-only",
    baseUrl: 'https://claude.ai',
    enabled: true,
    default_selector: "a[href^='/chat/'] .sr-only",
  },
  chatgpt: {
    name: 'ChatGPT',
    match: 'https://chatgpt.com/*',
    selector: 'PLACEHOLDER_CHATGPT_SELECTOR',
    baseUrl: 'https://chatgpt.com',
    enabled: true,
    default_selector: 'PLACEHOLDER_CHATGPT_SELECTOR',
  },
  gemini: {
    name: 'Gemini',
    match: 'https://gemini.google.com/*',
    selector: 'PLACEHOLDER_GEMINI_SELECTOR',
    baseUrl: 'https://gemini.google.com',
    enabled: true,
    default_selector: 'PLACEHOLDER_GEMINI_SELECTOR',
  },
};

// ─── Default settings ─────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  syncIntervalMinutes: 3,
};
