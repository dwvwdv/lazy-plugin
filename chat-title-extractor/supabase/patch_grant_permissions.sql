-- Patch: 補授 chat_extractor schema 的 role 權限
-- 適用情境：schema 已存在但忘記跑 GRANT，導致 anon/authenticated 無法存取
-- 如果是全新部署，跑 1_create_schema.sql 即可，不需要額外跑這個

GRANT USAGE ON SCHEMA chat_extractor TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON chat_extractor.chat_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_extractor.sync_status TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA chat_extractor
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
