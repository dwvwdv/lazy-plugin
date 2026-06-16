import { SUPABASE_URL, SUPABASE_ANON, GOOGLE_CLIENT_ID } from './config.js';

// Minimal Supabase client (no npm, just fetch)
export function supabase() {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
  };

  async function authHeaders() {
    const session = await getSession();
    if (session?.access_token) {
      return { ...headers, Authorization: `Bearer ${session.access_token}` };
    }
    return headers;
  }

  return {
    async signInWithIdToken(idToken, nonce) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'google',
          id_token: idToken,
          nonce,
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        await chrome.storage.local.set({ supabaseSession: data });
      }
      return data;
    },

    async signOut() {
      const h = await authHeaders();
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: h,
      });
      await chrome.storage.local.remove('supabaseSession');
    },

    async from(table) {
      const h = await authHeaders();
      return {
        async upsert(rows, { onConflict } = {}) {
          const url = `${SUPABASE_URL}/rest/v1/${table}` +
            (onConflict ? `?on_conflict=${onConflict}` : '');
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              ...h,
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(rows),
          });
          return res.ok ? { error: null } : { error: await res.json() };
        },
      };
    },
  };
}

export async function getSession() {
  const { supabaseSession } = await chrome.storage.local.get('supabaseSession');
  return supabaseSession || null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function signInWithGoogle() {
  const nonce = crypto.randomUUID();
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&response_type=id_token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid%20email%20profile` +
    `&nonce=${nonce}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
          return;
        }
        const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
        const idToken = params.get('id_token');
        if (!idToken) {
          reject(new Error('No id_token in redirect'));
          return;
        }
        const db = supabase();
        const data = await db.signInWithIdToken(idToken, nonce);
        if (data.access_token) resolve(data.user);
        else reject(new Error(data.error_description || 'Supabase sign-in failed'));
      }
    );
  });
}

export async function signOut() {
  const db = supabase();
  await db.signOut();
}
