import { supabase, getUser } from './auth.js';
import { getPlatforms, getCustomPlatforms, getExtensionUUID } from './storage.js';
import { extractFromTab } from './extractor.js';

export async function syncCurrentTab() {
  const user = await getUser();
  if (!user) return { error: 'Not signed in' };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { error: 'No active tab' };

  const platforms = await getPlatforms();
  const customs = await getCustomPlatforms();
  const allPlatforms = [
    ...Object.entries(platforms).map(([key, p]) => ({ key, ...p })),
    ...customs.map((c) => ({ key: c.id, ...c })),
  ];

  // Match current tab URL to a platform
  const matched = allPlatforms.find((p) => {
    if (!p.enabled) return false;
    const pattern = p.match.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(tab.url);
  });

  if (!matched) return { error: 'No matching platform for this tab' };

  const chats = await extractFromTab(tab.id, matched.selector, matched.baseUrl);
  if (!chats.length) return { error: 'No chats extracted', count: 0 };

  const uuid = await getExtensionUUID();
  const now = new Date().toISOString();
  const db = supabase();

  const rows = chats.map((c) => ({
    user_id: user.id,
    extension_uuid: uuid,
    platform: matched.key,
    title: c.title,
    url: c.url,
    updated_at: now,
  }));

  const { error } = await db.from('chat_records').upsert(rows, {
    onConflict: 'user_id,platform,url',
  });

  if (!error) {
    await db.from('sync_status').upsert({
      user_id: user.id,
      platform: matched.key,
      last_synced_at: now,
    });
    await chrome.storage.local.set({ lastSyncedAt: now, lastSyncCount: chats.length });
  }

  return { error, count: chats.length, platform: matched.name };
}
