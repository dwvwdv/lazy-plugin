-- ============================================================
-- [1/3] Create Schema
-- App: {app_name}
-- ============================================================

CREATE SCHEMA IF NOT EXISTS {app_name};

-- 給 anon / authenticated role 進入 schema 的權限
-- （沒有這步，即使 RLS policy 開放，role 也看不到 schema）
GRANT USAGE ON SCHEMA {app_name} TO anon, authenticated;

-- 給 role 對所有 table 的操作權限
-- 若有更嚴格的需求，可改為只對特定 table 授權
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {app_name} TO anon, authenticated;

-- 讓之後新建的 table 也自動繼承這份權限
ALTER DEFAULT PRIVILEGES IN SCHEMA {app_name}
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
