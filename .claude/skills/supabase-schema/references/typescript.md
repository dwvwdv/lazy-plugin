# Supabase Schema — TypeScript / JavaScript Boilerplate

## 安裝

```bash
npm install @supabase/supabase-js
```

---

## 基礎 Scoped Client（Header 方式，推薦）

用 `Content-Profile` / `Accept-Profile` header 指定預設 schema，所有 `.from()` 自動走該 schema。

```typescript
// lib/supabase/index.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 工廠函式：產生指定 schema 的 client
function createScopedClient(schema: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'Accept-Profile': schema,   // GET / HEAD 用
        'Content-Profile': schema,  // POST / PATCH / DELETE 用
      },
    },
    db: {
      schema: schema, // 讓 TypeScript 型別推斷也跟著走
    },
  })
}

// 每個 app 導出一個 client，直接 import 使用
export const db = createScopedClient('public')      // 預設 public
export const toolsDb = createScopedClient('tools')
export const gameDb = createScopedClient('game_backend')
export const blogDb = createScopedClient('blog')
```

### 使用方式

```typescript
import { toolsDb, blogDb } from '@/lib/supabase'

// tools schema
const { data: configs } = await toolsDb
  .from('configs')
  .select('*')

// blog schema
const { data: posts } = await blogDb
  .from('posts')
  .select('id, title, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

// 一般 CRUD 完全一樣，不需要 .schema()
const { error } = await toolsDb
  .from('configs')
  .insert({ key: 'theme', value: { mode: 'dark' } })
```

---

## 帶型別的版本（TypeScript 進階）

如果有用 `supabase gen types` 產生型別：

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase' // supabase gen types 產生的

function createScopedClient<S extends keyof Database>(schema: S) {
  return createClient<Database, S>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'Accept-Profile': schema as string,
          'Content-Profile': schema as string,
        },
      },
      db: { schema },
    }
  )
}

export const toolsDb = createScopedClient('tools')
// 現在 toolsDb.from('configs') 會有完整型別提示
```

---

## Auth 共用注意事項

Auth 是 Project 層級共用的，所有 schema 的 client 共享同一個 session：

```typescript
// Auth 操作統一用預設 client 或任一 scoped client 都可以
import { db } from '@/lib/supabase'

const { data: { user } } = await db.auth.getUser()

// 所有 scoped client 都能讀到同一個 auth state
const { data } = await toolsDb
  .from('user_configs')
  .select('*')
  // RLS 的 auth.uid() 會正確拿到當前登入用戶
```

---

## 環境變數

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 後端 / Server Action 用（繞過 RLS）
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Server-side scoped client（繞過 RLS）：

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export const toolsAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role，繞過 RLS
  {
    global: {
      headers: {
        'Accept-Profile': 'tools',
        'Content-Profile': 'tools',
      },
    },
  }
)
```
