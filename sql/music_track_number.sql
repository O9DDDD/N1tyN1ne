-- ═══════════════════════════════════════════════════
-- N1tyN1ne · 添加音轨号字段
-- ═══════════════════════════════════════════════════
-- 在 Supabase SQL Editor 中运行:
-- https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new

ALTER TABLE music ADD COLUMN IF NOT EXISTS track_number INTEGER;

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'music'
ORDER BY ordinal_position;
