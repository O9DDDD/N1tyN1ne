-- 创建 MV 存储桶（公开访问）
-- 在 Supabase SQL Editor 中运行此 SQL

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mv', 'mv', true, 524288000, '{video/mp4,video/webm,video/x-matroska,video/quicktime,video/x-msvideo}')
ON CONFLICT (id) DO NOTHING;

-- 允许公开读取 MV 文件
CREATE POLICY "Public MV access" ON storage.objects
  FOR SELECT USING (bucket_id = 'mv');
