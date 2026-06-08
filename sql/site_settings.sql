DROP TABLE IF EXISTS site_settings;

CREATE TABLE site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_title TEXT,
  hero_desc TEXT,
  about_intro TEXT,
  about_title2 TEXT,
  about_desc2 TEXT,
  about_title3 TEXT,
  about_desc3 TEXT
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "public_read" ON site_settings FOR SELECT USING (true);

-- 仅 admin 可新增
CREATE POLICY "admin_insert" ON site_settings FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 仅 admin 可更新（USING + WITH CHECK 缺一不可）
CREATE POLICY "admin_update" ON site_settings FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO site_settings (id) VALUES (1);
