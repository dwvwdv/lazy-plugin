-- ============================================================
-- [3/3] RLS Policies
-- App: {app_name}
-- ============================================================

-- Step 1: 開啟 RLS（每張 table 都要執行）
ALTER TABLE {app_name}.example_table ENABLE ROW LEVEL SECURITY;

-- Step 2: 選擇對應情境的 Policy（擇一套用，刪除其餘）

-- ────────────────────────────────────────
-- 情境 A：個人工具 / 無用戶隔離，全開放
-- ────────────────────────────────────────
CREATE POLICY "allow_all"
  ON {app_name}.example_table
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────
-- 情境 B：登入用戶只能存取自己的資料
-- 前提：table 有 user_id uuid 欄位
-- ────────────────────────────────────────
-- CREATE POLICY "owner_only"
--   ON {app_name}.example_table
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────
-- 情境 C：讀全部，寫只能自己的
-- ────────────────────────────────────────
-- CREATE POLICY "read_all"
--   ON {app_name}.example_table
--   FOR SELECT
--   USING (true);
--
-- CREATE POLICY "write_own"
--   ON {app_name}.example_table
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────
-- 情境 D：完全鎖定，只允許 service_role
-- （不需要 policy，RLS 開啟後預設拒絕所有 anon/authenticated）
-- ────────────────────────────────────────
