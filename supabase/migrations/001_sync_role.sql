-- ═══════════════════════════════════════════════════
-- 迁移 001：profiles.role → app_metadata 同步触发器
-- ═══════════════════════════════════════════════════
-- 在 Supabase SQL Editor 中运行整个文件：
--   https://supabase.com/dashboard/project/fjybxoqfatxtgydltvuw/sql/new

-- 1. 同步函数
CREATE OR REPLACE FUNCTION sync_role_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 2. UPDATE 触发器
DROP TRIGGER IF EXISTS trg_sync_role_update ON public.profiles;
CREATE TRIGGER trg_sync_role_update
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_app_metadata();

-- 3. INSERT 触发器
DROP TRIGGER IF EXISTS trg_sync_role_insert ON public.profiles;
CREATE TRIGGER trg_sync_role_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_app_metadata();

-- 4. 回填现有数据
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles WHERE role IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', r.role)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5. 验证同步结果
SELECT u.email, u.raw_app_meta_data->>'role' AS app_role, p.role AS db_role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id;
