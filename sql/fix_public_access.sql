-- ═══════════════════════════════════════════════════
-- N1tyN1ne · 公开读取策略修复
-- 确保 music/posts/comments/friends 表允许匿名读取
-- ═══════════════════════════════════════════════════
-- 在 Supabase SQL Editor 中运行:
-- https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new

-- music 表公开读取
ALTER TABLE music ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read music" ON music;
CREATE POLICY "Public read music" ON music FOR SELECT USING (true);

-- posts 表公开读取
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read posts" ON posts;
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);

-- comments 表公开读取
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read comments" ON comments;
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);

-- friends 表公开读取
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read friends" ON friends;
CREATE POLICY "Public read friends" ON friends FOR SELECT USING (true);

-- 允许认证用户插入/更新/删除自己的数据（music/posts/comments 需要）
DROP POLICY IF EXISTS "Auth users insert music" ON music;
CREATE POLICY "Auth users insert music" ON music FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update music" ON music;
CREATE POLICY "Auth users update music" ON music FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete music" ON music;
CREATE POLICY "Auth users delete music" ON music FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert posts" ON posts;
CREATE POLICY "Auth users insert posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update posts" ON posts;
CREATE POLICY "Auth users update posts" ON posts FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete posts" ON posts;
CREATE POLICY "Auth users delete posts" ON posts FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert comments" ON comments;
CREATE POLICY "Auth users insert comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update comments" ON comments;
CREATE POLICY "Auth users update comments" ON comments FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete comments" ON comments;
CREATE POLICY "Auth users delete comments" ON comments FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert friends" ON friends;
CREATE POLICY "Auth users insert friends" ON friends FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update friends" ON friends;
CREATE POLICY "Auth users update friends" ON friends FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete friends" ON friends;
CREATE POLICY "Auth users delete friends" ON friends FOR DELETE USING (auth.role() = 'authenticated');

-- 验证
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('music','posts','comments','friends') ORDER BY tablename, cmd;
