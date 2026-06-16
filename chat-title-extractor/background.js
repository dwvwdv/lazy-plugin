import { initStorage, getPlatforms, getCustomPlatforms, getSettings, resetAllSettings, getExtensionUUID } from './storage.js';
import { SUPABASE_URL, SUPABASE_ANON, SUPABASE_SCHEMA, GOOGLE_CLIENT_ID } from './config.js';

const ALARM_NAME = 'auto-sync';

// ─── Init ──────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  await initStorage();
  await scheduleAlarm();
});

chrome.runtime.onStartup.addListener(scheduleAlarm);

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.settings) await scheduleAlarm();
});

async function scheduleAlarm() {
  const { syncIntervalMinutes } = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: syncIntervalMinutes });
}

// ─── Alarm ─────────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await doSync();
});

// ─── Messages from popup ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'MANUAL_SYNC') {
    doSync().then(sendResponse);
    return true;
  }
  // -- 登入功能暫時停用（測試階段）--
  // if (msg.type === 'SIGN_IN') {
  //   signInWithGoogle().then(sendResponse).catch(e => sendResponse({ error: e.message }));
  //   return true;
  // }
  // if (msg.type === 'SIGN_OUT') {
  //   signOut().then(() => sendResponse({}));
  //   return true;
  // }
  if (msg.type === 'RESET_SETTINGS') {
    resetAllSettings().then(() => sendResponse({}));
    return true;
  }
});

// -- 測試用：不需登入，直接用 anon key 送出（RLS 需另外調整才能實際寫入）--
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── Supabase REST helper（帶 schema header）──────────────────────────────────
function makeHeaders(accessToken) {
  return {
    'Content-Type':   'application/json',
    'apikey':         SUPABASE_ANON,
    'Authorization':  `Bearer ${accessToken}`,
    'Accept-Profile': SUPABASE_SCHEMA,
    'Content-Profile': SUPABASE_SCHEMA,
    'Prefer':         'resolution=merge-duplicates,return=minimal',
  };
}

async function upsert(table, rows, onConflict, accessToken) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`,
    { method: 'POST', headers: makeHeaders(accessToken), body: JSON.stringify(rows) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase upsert ${table} failed (${res.status})`);
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
async function getSession() {
  const { supabaseSession } = await chrome.storage.local.get('supabaseSession');
  return supabaseSession || null;
}

async function signInWithGoogle() {
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
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (url) => {
      if (chrome.runtime.lastError || !url) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth cancelled'));
        return;
      }
      const params = new URLSearchParams(new URL(url).hash.substring(1));
      const idToken = params.get('id_token');
      if (!idToken) { reject(new Error('No id_token')); return; }

      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ provider: 'google', id_token: idToken, nonce }),
      });
      const data = await res.json();
      if (data.access_token) {
        await chrome.storage.local.set({ supabaseSession: data });
        resolve(data.user);
      } else {
        reject(new Error(data.error_description || 'Supabase auth failed'));
      }
    });
  });
}

async function signOut() {
  const session = await getSession();
  if (session?.access_token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  }
  await chrome.storage.local.remove('supabaseSession');
}

// ─── Sync ──────────────────────────────────────────────────────────────────────
async function doSync() {
  // -- 測試階段：略過登入，直接用 anon key --
  // const session = await getSession();
  // if (!session?.user) return { error: '尚未登入' };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { error: '無活動頁面' };

  const platforms = await getPlatforms();
  const customs   = await getCustomPlatforms();
  const allP = [
    ...Object.entries(platforms).map(([k, p]) => ({ key: k, ...p })),
    ...customs.map(c => ({ key: c.id, ...c })),
  ];

  const matched = allP.find(p => {
    if (!p.enabled || !p.selector || p.selector.startsWith('PLACEHOLDER')) return false;
    const re = new RegExp('^' + p.match.replace(/\*/g, '.*') + '$');
    return re.test(tab.url);
  });

  if (!matched) return { error: '當前頁面不在支援平台內' };

  let chats = [];
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel, base) => {
        const els = document.querySelectorAll(sel);
        const out = [], seen = new Set();
        els.forEach(el => {
          const anchor = el.closest('a[href]') || el;
          const title  = el.textContent?.trim();
          const href   = anchor.getAttribute('href');
          if (!title || !href) return;
          const url = href.startsWith('http') ? href : base + href;
          if (seen.has(url)) return;
          seen.add(url);
          out.push({ title, url });
        });
        return out;
      },
      args: [matched.selector, matched.baseUrl],
    });
    chats = result || [];
  } catch (e) {
    return { error: `提取失敗: ${e.message}` };
  }

  if (!chats.length) return { error: '未提取到任何對話', count: 0 };

  const uuid  = await getExtensionUUID();
  // -- 測試階段：用 DEV_USER_ID + SUPABASE_ANON 取代真實 session --
  // const user  = session.user;
  // const token = session.access_token;
  const now   = new Date().toISOString();
  const token = SUPABASE_ANON;

  try {
    const rows = chats.map(c => ({
      user_id:        DEV_USER_ID,
      extension_uuid: uuid,
      platform:       matched.key,
      title:          c.title,
      url:            c.url,
      updated_at:     now,
    }));

    await upsert('chat_records', rows, 'user_id,platform,url', token);

    await upsert('sync_status', [{
      user_id:        DEV_USER_ID,
      platform:       matched.key,
      last_synced_at: now,
    }], 'user_id,platform', token);

  } catch (e) {
    return { error: e.message };
  }

  await chrome.storage.local.set({ lastSyncedAt: now, lastSyncCount: chats.length });
  return { count: chats.length, platform: matched.name };
}
