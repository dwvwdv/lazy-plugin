---
name: supabase-schema
description: |
  Supabase 多 App Schema 隔離策略 Skill。管理「一個 Supabase Project 跑多個 App」的完整工作流，
  涵蓋 Schema 建立、API 開放設定、RLS Policy、以及三種 SDK（TypeScript/JS、Python、Flutter）的
  scoped client 初始化 boilerplate。

  當用戶說以下任何一種，立即使用此 Skill：
  - 「幫我建 supabase schema」「新增一個 app 到 supabase」「supabase 新增 schema」
  - 「supabase 多 app」「一個 project 跑多個 app」「schema 隔離」
  - 「supabase client 指定 schema」「scoped client」「schema boilerplate」
  - 「幫我套 supabase schema 結構」「新增一個 schema 給 XX app」
  - 任何涉及 Supabase + schema 分離 + 多 app 管理的需求，即使沒有明確說「schema」二字也應觸發

  不適用：只有單一 App 的 Supabase 專案（全 public schema 即可）、Supabase Auth 深度設定、Storage 管理。
---

# Supabase Multi-App Schema Skill

**核心策略**：一個 Supabase Project，用 PostgreSQL Schema 隔離多個 App，搭配 scoped client 讓每個 App 感覺不到 schema 的存在。

---

## 檔案索引

| 檔案 | 說明 |
|------|------|
| `sql/1_create_schema.sql` | Schema 建立模板 |
| `sql/2_create_tables.sql` | Table + trigger 模板 |
| `sql/3_rls_policies.sql` | RLS 開啟 + Policy 情境模板 |
| `references/typescript.md` | TS/JS scoped client boilerplate |
| `references/python.md` | Python scoped client boilerplate |
| `references/flutter.md` | Flutter scoped client boilerplate |

---

## 輸出規範（重要）

當用戶要求建立新 App 的 schema 時，**必須產出三個獨立 SQL 檔案**，放在 `supabase/` 子目錄下：

```
supabase/
├── 1_create_schema.sql
├── 2_create_tables.sql
└── 3_rls_policies.sql
```

### 生成規則

1. 以 `sql/` 下的三個模板為基礎
2. 將所有 `{app_name}` 替換為用戶指定的 schema 名稱
3. `2_create_tables.sql` 依用戶描述的資料結構填入實際 table 定義
4. `3_rls_policies.sql` 依使用情境決定啟用哪個 Policy（其餘保留為註解）
5. 三個檔案用 `present_files` 一次呈現，**不在對話中貼出 SQL 內容**

### Schema 命名規則

- 小寫底線：`game_backend`、`blog`、`tools`
- 不用 `app_` 前綴（除非用戶指定）
- 避免與 PostgreSQL 保留字衝突：`public`、`pg_*`、`information_schema`

---

## 執行流程

### Step 1：收集資訊

觸發後先確認：
- **schema 名稱**（若用戶未說，根據 app 用途推薦一個）
- **需要哪些 table**（欄位、型別）
- **RLS 情境**（A 全開放 / B 用戶隔離 / C 讀全寫自己 / D 完全鎖定）
- **Client 語言**（TS/Python/Flutter，用於後續 boilerplate）

若資訊不足，**問完再生成**，不要猜測 table 結構。

### Step 2：生成 SQL 檔案

依輸出規範產出三個 `.sql` 檔，存到 `/mnt/user-data/outputs/supabase/`。

### Step 3：Dashboard 提醒

檔案產出後，提醒用戶手動完成：

> ⚠️ **Dashboard → Settings → API → Exposed Schemas** 加入 `{app_name}`

### Step 4：Scoped Client（依需求）

用戶確認 SQL 執行完畢後，依語言讀取對應 reference 產出 client 初始化程式碼：
- TypeScript/JS → `references/typescript.md`
- Python → `references/python.md`
- Flutter/Dart → `references/flutter.md`

---

## 新增 App Checklist

```
□ 執行 1_create_schema.sql（含 GRANT USAGE + GRANT ON TABLES）
□ 執行 2_create_tables.sql
□ 執行 3_rls_policies.sql
□ Dashboard → Exposed Schemas 加入新 schema
□ 初始化 scoped client
□ 驗證：Table Editor 左上角切換 schema，確認 table 出現
```

---

## 常見問題

**Q：讀不到資料，一直是空的**
→ 先確認 Dashboard → Exposed Schemas 有沒有加到

**Q：RLS 設了但所有 query 都被擋**
→ 確認 `3_rls_policies.sql` 啟用的是哪個情境，個人工具用情境 A

**Q：想跨 schema 查詢**
→ SQL JOIN 加 schema prefix：`SELECT * FROM tools.configs JOIN blog.posts ON ...`
→ 或兩個 scoped client 分別查後在程式端合併

**Q：schema 需要改名**
→ `ALTER SCHEMA old_name RENAME TO new_name;`
→ 同步更新 Exposed Schemas 設定和 client 初始化

**Q：有 RLS policy 但 query 回 empty / permission denied**
→ 確認 `1_create_schema.sql` 有執行 `GRANT USAGE ON SCHEMA` 和 `GRANT ... ON ALL TABLES`
→ 自訂 schema 預設不繼承 public 的 role 權限，兩層都要明確授予
