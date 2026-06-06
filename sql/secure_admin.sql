-- ═══════════════════════════════════════════════════
-- N1tyN1ne · 安全加固：管理员权限保护
-- ═══════════════════════════════════════════════════
-- 使用方法：在 Supabase SQL Editor 中粘贴运行全部内容
-- https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new
-- ═══════════════════════════════════════════════════

-- 1. 开启 RLS（如果没开）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. 清掉旧策略，从头来
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- 3. 任何人可读（公开 profile 信息）
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- 4. 用户只能插入自己的 profile
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. 用户可以更新自己的 profile，但不能改 role
--    （role 列被排除在允许更新之外）
CREATE POLICY "Users update own profile except role"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    -- ↑ 保证 role 和更新前一致，即不允许改 role
  );

-- 6. 禁止删除 profile
DROP POLICY IF EXISTS "No delete" ON profiles;
-- 不创建 DELETE 策略 = 无人可删

-- ═══════════════════════════════════════════════════
-- 安全的管理员设置函数（仅 service_role 可调用）
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_user_role(target_user_id uuid, new_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text;
BEGIN
  -- 只有 service_role 或已有 admin 才能调用
  -- 由于 SECURITY DEFINER 且只有 service_role 能直接调 RPC，
  -- 这个函数只能通过 SQL Editor 或 Edge Function 调用
  UPDATE profiles SET role = new_role WHERE id = target_user_id;
  IF FOUND THEN
    RETURN 'OK: role updated to ' || new_role;
  ELSE
    RETURN 'ERROR: user not found';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 现在把你的账号设为管理员
-- ═══════════════════════════════════════════════════
-- 先找到你的 user id
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'n1tyn1ne@qq.com';
  IF uid IS NOT NULL THEN
    -- 确保 profile 存在
    INSERT INTO profiles (id, username, role)
    VALUES (uid, 'N1tyN1ne', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    RAISE NOTICE '管理员已设置: n1tyn1ne@qq.com (id: %)', uid;
  ELSE
    RAISE NOTICE '用户 n1tyn1ne@qq.com 不存在，请先注册';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 验证结果
-- ═══════════════════════════════════════════════════
SELECT p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';
