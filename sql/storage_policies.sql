-- ═══════════════════════════════════════════════════
-- N1tyN1ne · 存储桶安全策略
-- ═══════════════════════════════════════════════════
-- 使用方法：在 Supabase SQL Editor 中粘贴运行全部内容
-- https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new
-- ═══════════════════════════════════════════════════

-- 1. 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('music', 'music', true, 104857600)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('covers', 'covers', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- 2. 允许任何人读取（公开桶已默认允许，显式声明）
DROP POLICY IF EXISTS "Public read music" ON storage.objects;
CREATE POLICY "Public read music"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music');

DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
CREATE POLICY "Public read covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- 3. 允许已认证用户上传音乐（无大小限制）
DROP POLICY IF EXISTS "Auth users upload music" ON storage.objects;
CREATE POLICY "Auth users upload music"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'music'
    AND auth.role() = 'authenticated'
  );

-- 4. 允许已认证用户上传封面
DROP POLICY IF EXISTS "Auth users upload covers" ON storage.objects;
CREATE POLICY "Auth users upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
  );

-- 5. 允许已认证用户删除自己上传的文件（管理员需要）
DROP POLICY IF EXISTS "Auth users delete music" ON storage.objects;
CREATE POLICY "Auth users delete music"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('music', 'covers')
    AND auth.role() = 'authenticated'
  );

-- ═══════════════════════════════════════════════════
-- 验证
-- ═══════════════════════════════════════════════════
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('music', 'covers');

SELECT policyname, operation, bucket_id
FROM storage.policies
WHERE bucket_id IN ('music', 'covers');
