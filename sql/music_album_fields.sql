-- ═══════════════════════════════════════════════════
-- N1tyN1ne · 专辑字段：艺术家 + 年份
-- ═══════════════════════════════════════════════════

ALTER TABLE music ADD COLUMN IF NOT EXISTS album_artist TEXT;
ALTER TABLE music ADD COLUMN IF NOT EXISTS album_year TEXT;

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'music'
ORDER BY ordinal_position;
