-- Phase 1: 建立 chat_extractor schema
-- 執行後至 Dashboard → Settings → API → Exposed Schemas 加入 chat_extractor

CREATE SCHEMA chat_extractor;

-- 給 anon / authenticated role 進入 schema 的權限
GRANT USAGE ON SCHEMA chat_extractor TO anon, authenticated;

-- 給 role 對所有 table 的操作權限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA chat_extractor TO anon, authenticated;

-- 讓之後新建的 table 也自動繼承這份權限
ALTER DEFAULT PRIVILEGES IN SCHEMA chat_extractor
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
