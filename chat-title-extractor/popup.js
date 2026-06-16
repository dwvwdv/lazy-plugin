// ─── Helpers ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 2200);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ─── Storage shortcuts (no module imports in popup MV3 inline) ────────────────
const store = {
  async get(keys) { return chrome.storage.local.get(keys); },
  async set(obj)  { return chrome.storage.local.set(obj); },
};

async function getPlatforms() {
  const { platforms } = await store.get('platforms');
  return platforms || {};
}

async function getCustomPlatforms() {
  const { customPlatforms } = await store.get('customPlatforms');
  return customPlatforms || [];
}

async function getSettings() {
  const { settings } = await store.get('settings');
  return { syncIntervalMinutes: 3, ...(settings || {}) };
}

// ─── Auth state ───────────────────────────────────────────────────────────────
async function getSession() {
  const { supabaseSession } = await store.get('supabaseSession');
  return supabaseSession || null;
}

// -- 測試階段：略過登入，直接顯示為 online --
async function refreshAuthUI() {
  $('loggedOut').style.display = 'none';
  $('loggedIn').style.display  = 'block';
  $('userEmail').textContent    = 'dev-mode (no login)';
  $('btnSync').disabled         = false;
  $('headerStatus').textContent = 'dev';
  $('headerStatus').className   = 'badge online';
  $('aboutUID').textContent     = '00000000-0000-0000-0000-000000000000';
}

// ─── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'settings') renderSettings();
    if (tab.dataset.tab === 'about') renderAbout();
  });
});

// ─── Main page: sync status ───────────────────────────────────────────────────
async function refreshSyncStatus() {
  const { lastSyncedAt, lastSyncCount } = await store.get(['lastSyncedAt', 'lastSyncCount']);
  $('lastSync').textContent  = fmtDate(lastSyncedAt) || '—';
  $('syncCount').textContent = lastSyncCount != null ? `${lastSyncCount} 筆` : '—';
}

// ─── Main page: preview chat list ────────────────────────────────────────────
async function previewChatList() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const platforms  = await getPlatforms();
  const customs    = await getCustomPlatforms();
  const allP = [
    ...Object.entries(platforms).map(([k, p]) => ({ key: k, ...p })),
    ...customs.map(c => ({ key: c.id, ...c })),
  ];

  const matched = allP.find(p => {
    if (!p.enabled || !p.selector || p.selector.startsWith('PLACEHOLDER')) return false;
    const re = new RegExp('^' + p.match.replace(/\*/g, '.*') + '$');
    return re.test(tab.url);
  });

  const listEl = $('chatList');
  if (!matched) {
    listEl.innerHTML = '<div class="empty">當前頁面不是支援的平台</div>';
    $('chatCount').textContent = '—';
    return;
  }

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

    listEl.innerHTML = '';
    $('chatCount').textContent = `${result.length} 筆`;

    if (!result.length) {
      listEl.innerHTML = '<div class="empty">未找到對話（確認 selector 正確）</div>';
      return;
    }

    result.forEach(item => {
      const div = document.createElement('div');
      div.className   = 'chat-item';
      div.textContent = item.title;
      div.title       = item.url;
      div.onclick     = () => chrome.tabs.create({ url: item.url });
      listEl.appendChild(div);
    });
  } catch (e) {
    listEl.innerHTML = `<div class="empty" style="color:var(--red)">提取失敗: ${e.message}</div>`;
  }
}

// -- 測試階段：登入 / 登出功能暫時停用 --
// $('btnSignIn').addEventListener('click', async () => { ... });
// $('btnSignOut').addEventListener('click', async () => { ... });

// ─── Manual sync ──────────────────────────────────────────────────────────────
$('btnSync').addEventListener('click', async () => {
  $('btnSync').disabled = true;
  $('btnSync').textContent = '同步中…';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' });
    if (res?.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`已同步 ${res.count} 筆 (${res.platform})`, 'success');
      await refreshSyncStatus();
      await previewChatList();
    }
  } catch (e) {
    showToast('同步失敗', 'error');
  } finally {
    $('btnSync').disabled = false;
    $('btnSync').textContent = '立即提取並同步';
  }
});

// ─── Settings page ────────────────────────────────────────────────────────────
async function renderSettings() {
  const platforms = await getPlatforms();
  const customs   = await getCustomPlatforms();
  const settings  = await getSettings();

  $('intervalInput').value = settings.syncIntervalMinutes;

  // Built-in platforms
  const listEl = $('platformList');
  listEl.innerHTML = '';
  Object.entries(platforms).forEach(([key, p]) => {
    listEl.appendChild(buildPlatformRow(key, p, false));
  });

  // Custom platforms
  const customEl = $('customList');
  customEl.innerHTML = '';
  customs.forEach(c => {
    customEl.appendChild(buildPlatformRow(c.id, c, true));
  });
}

function buildPlatformRow(key, p, isCustom) {
  const row = document.createElement('div');
  row.className = 'platform-row';

  const header = document.createElement('div');
  header.className = 'platform-header';

  const name = document.createElement('div');
  name.className = 'platform-name';
  name.textContent = p.name || key;

  const toggle = document.createElement('div');
  toggle.className = 'platform-toggle' + (p.enabled ? ' on' : '');
  toggle.onclick = async (e) => {
    e.stopPropagation();
    await togglePlatform(key, isCustom);
    toggle.classList.toggle('on');
  };

  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.textContent = '▶';

  header.append(name, toggle, chevron);

  const body = document.createElement('div');
  body.className = 'platform-body';

  // Selector input row
  const label = document.createElement('div');
  label.className = 'field-label';
  label.style.marginTop = '8px';
  label.textContent = 'CSS Selector';

  const inputRow = document.createElement('div');
  inputRow.className = 'input-row';

  const input = document.createElement('input');
  input.className = 'selector-input';
  input.value = p.selector || '';
  input.placeholder = 'CSS selector…';

  const charCount = document.createElement('span');
  charCount.className = 'char-count';
  charCount.textContent = input.value.length;
  input.oninput = () => { charCount.textContent = input.value.length; };

  const testBtn = document.createElement('button');
  testBtn.className = 'btn btn-ghost';
  testBtn.textContent = '測試';
  testBtn.style.fontSize = '10px';
  testBtn.style.padding = '4px 8px';

  inputRow.append(input, charCount, testBtn);

  const testResult = document.createElement('div');
  testResult.className = 'test-result';

  // Save + Reset buttons
  const metaRow = document.createElement('div');
  metaRow.className = 'input-meta';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.fontSize = '10px';
  saveBtn.style.padding = '3px 8px';
  saveBtn.textContent = '儲存';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost';
  resetBtn.style.fontSize = '10px';
  resetBtn.style.padding = '3px 8px';
  resetBtn.textContent = '還原預設';
  if (isCustom) resetBtn.style.display = 'none';

  metaRow.append(saveBtn, resetBtn);

  // Delete button for custom
  if (isCustom) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-full';
    delBtn.style.marginTop = '8px';
    delBtn.style.fontSize = '10px';
    delBtn.textContent = '刪除此自訂網站';
    delBtn.onclick = async () => {
      const customs = await getCustomPlatforms();
      const next = customs.filter(c => c.id !== key);
      await store.set({ customPlatforms: next });
      row.remove();
      showToast('已刪除', 'success');
    };
    body.appendChild(delBtn);
  }

  body.append(label, inputRow, testResult, metaRow);

  // Test
  testBtn.onclick = async () => {
    const sel = input.value.trim();
    if (!sel) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (s) => document.querySelectorAll(s).length,
        args: [sel],
      });
      testResult.className = 'test-result show';
      testResult.textContent = `找到 ${result} 個元素`;
    } catch (e) {
      testResult.className = 'test-result show error';
      testResult.textContent = `Selector 錯誤: ${e.message}`;
    }
  };

  // Save
  saveBtn.onclick = async () => {
    const newSel = input.value.trim();
    await updatePlatformSelector(key, newSel, isCustom);
    showToast(`${p.name || key} selector 已儲存`, 'success');
  };

  // Reset
  resetBtn.onclick = async () => {
    const { platforms } = await store.get('platforms');
    const def = platforms?.[key]?.default_selector;
    if (def) {
      input.value = def;
      charCount.textContent = def.length;
      await updatePlatformSelector(key, def, false);
      showToast('已還原預設', 'success');
    }
  };

  // Toggle expand
  header.onclick = () => {
    body.classList.toggle('open');
    chevron.classList.toggle('open');
  };

  row.append(header, body);
  return row;
}

async function togglePlatform(key, isCustom) {
  if (isCustom) {
    const customs = await getCustomPlatforms();
    const next = customs.map(c => c.id === key ? { ...c, enabled: !c.enabled } : c);
    await store.set({ customPlatforms: next });
  } else {
    const { platforms } = await store.get('platforms');
    platforms[key].enabled = !platforms[key].enabled;
    await store.set({ platforms });
  }
}

async function updatePlatformSelector(key, selector, isCustom) {
  if (isCustom) {
    const customs = await getCustomPlatforms();
    const next = customs.map(c => c.id === key ? { ...c, selector } : c);
    await store.set({ customPlatforms: next });
  } else {
    const { platforms } = await store.get('platforms');
    platforms[key].selector = selector;
    await store.set({ platforms });
  }
}

// Interval save
$('intervalInput').addEventListener('change', async () => {
  const val = Math.max(1, Math.min(60, parseInt($('intervalInput').value) || 3));
  $('intervalInput').value = val;
  const settings = await getSettings();
  await store.set({ settings: { ...settings, syncIntervalMinutes: val } });
  showToast(`已設定為每 ${val} 分鐘同步`, 'success');
});

// Add custom platform
$('btnAddCustom').addEventListener('click', () => {
  $('addForm').classList.toggle('open');
});
$('btnCancelCustom').addEventListener('click', () => {
  $('addForm').classList.remove('open');
});
$('btnSaveCustom').addEventListener('click', async () => {
  const name     = $('customName').value.trim();
  const match    = $('customMatch').value.trim();
  const baseUrl  = $('customBaseUrl').value.trim();
  const selector = $('customSelector').value.trim();

  if (!name || !match || !selector) {
    showToast('名稱、網址匹配、Selector 必填', 'error');
    return;
  }

  const customs = await getCustomPlatforms();
  customs.push({ id: crypto.randomUUID(), name, match, baseUrl, selector, enabled: true });
  await store.set({ customPlatforms: customs });

  $('addForm').classList.remove('open');
  ['customName','customMatch','customBaseUrl','customSelector'].forEach(id => $(id).value = '');
  showToast(`已新增 ${name}`, 'success');
  await renderSettings();
});

// Reset all
$('btnReset').addEventListener('click', async () => {
  if (!confirm('確定要還原所有設定為預設值？')) return;
  await chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
  await renderSettings();
  showToast('已還原預設設定', 'success');
});

// ─── About page ───────────────────────────────────────────────────────────────
async function renderAbout() {
  const { extensionUUID } = await store.get('extensionUUID');
  $('aboutUUID').textContent = extensionUUID || '—';
  const session = await getSession();
  $('aboutUID').textContent = session?.user?.id || '—';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await refreshAuthUI();
  await refreshSyncStatus();
  await previewChatList();
})();
