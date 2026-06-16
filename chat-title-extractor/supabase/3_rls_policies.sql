-- Phase 4: 開啟 RLS 並設定 Policy

ALTER TABLE chat_extractor.chat_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_extractor.sync_status  ENABLE ROW LEVEL SECURITY;

-- 登入用戶只能存取自己的資料
CREATE POLICY "owner only"
  ON chat_extractor.chat_records FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner only"
  ON chat_extractor.sync_status FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
