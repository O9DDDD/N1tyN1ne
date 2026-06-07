-- ═══════════════════════════════════════════════════
-- N1tyN1ne · Music Schema v2
-- 添加专辑/分类支持
-- ═══════════════════════════════════════════════════
-- 在 Supabase SQL Editor 中运行:
-- https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new

ALTER TABLE music ADD COLUMN IF NOT EXISTS album TEXT;
ALTER TABLE music ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE music ADD COLUMN IF NOT EXISTS album_description TEXT;

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'music'
ORDER BY ordinal_position;
