-- Phase 3: 建立資料表

CREATE TABLE chat_extractor.chat_records (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id),
  extension_uuid text        NOT NULL,
  platform       text        NOT NULL,
  title          text        NOT NULL,
  url            text        NOT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (user_id, platform, url)
);

CREATE TABLE chat_extractor.sync_status (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users(id),
  platform       text        NOT NULL,
  last_synced_at timestamptz NOT NULL
);
