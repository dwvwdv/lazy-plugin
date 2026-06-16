// ─── Supabase ────────────────────────────────────────────────────────────────
export const SUPABASE_URL    = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON   = 'YOUR_SUPABASE_ANON_KEY';
export const SUPABASE_SCHEMA = 'chat_extractor';   // <- schema 名稱

// ─── Google OAuth ─────────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

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
