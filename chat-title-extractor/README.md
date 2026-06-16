# Chat Title Extractor

提取 AI 平台對話標題並同步至 Supabase 的 Chrome 擴展。

## 支援平台
- Claude (claude.ai)
- ChatGPT (chatgpt.com) — selector 待補
- Gemini (gemini.google.com) — selector 待補
- 自訂網站（可在設定頁新增）

---

## 安裝步驟

### 1. 填入設定值 `config.js`

```js
export const SUPABASE_URL    = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON   = 'YOUR_SUPABASE_ANON_KEY';
export const SUPABASE_SCHEMA = 'chat_extractor';
export const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
```

### 2. Supabase — Phase 1：建 Schema

```sql
CREATE SCHEMA chat_extractor;
```

### 3. Supabase — Phase 2：開放 API

Dashboard → Settings → API → Exposed Schemas，加入 `chat_extractor`：

```
public, chat_extractor
```

⚠️ 這步最常忘，忘了 client 會讀不到資料。

### 4. Supabase — Phase 3：建 Table

```sql
CREATE TABLE chat_extractor.chat_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id),
  extension_uuid text not null,
  platform       text not null,
  title          text not null,
  url            text not null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, platform, url)
);

CREATE TABLE chat_extractor.sync_status (
  user_id        uuid primary key references auth.users(id),
  platform       text not null,
  last_synced_at timestamptz not null
);
```

### 5. Supabase — Phase 4：RLS

```sql
ALTER TABLE chat_extractor.chat_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_extractor.sync_status  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only" ON chat_extractor.chat_records FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner only" ON chat_extractor.sync_status FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 6. Supabase Google OAuth

Dashboard → Authentication → Providers → Google，填入 Client ID 與 Secret。

### 7. Google Cloud Console

建立 OAuth 2.0 Client，類型選「Chrome 擴展」，Redirect URI 填：
`https://<extension-id>.chromiumapp.org/`

Extension ID 安裝後在 `chrome://extensions` 查看。

### 8. 載入擴展

1. `chrome://extensions` → 開發者模式
2. 載入未封裝項目 → 選本資料夾

---

## 安全性說明

- 擴展只用 `anon` key，不含任何 `service_role` key
- 所有 Table 啟用 RLS，policy 限制 `user_id = auth.uid()`
- Schema 隔離：`chat_extractor` schema 與其他 App 互不干擾
- REST 請求帶 `Content-Profile: chat_extractor` header 指定 schema
