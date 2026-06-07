-- ═══════════════════════════════════════════════════
-- N1tyN1ne · MV 字段：多码率 JSON
-- ═══════════════════════════════════════════════════

ALTER TABLE music ADD COLUMN IF NOT EXISTS mv_url TEXT;

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'music'
ORDER BY ordinal_position;
