-- ============================================================
-- [2/3] Create Tables
-- App: {app_name}
-- ============================================================

-- ⚠️ 替換 {app_name} 為實際 schema 名稱
-- ⚠️ 依需求新增或刪除 table

CREATE TABLE {app_name}.example_table (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- auto-update updated_at trigger（若 function 尚未建立則先執行）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_{app_name}_example_table_updated_at
  BEFORE UPDATE ON {app_name}.example_table
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
