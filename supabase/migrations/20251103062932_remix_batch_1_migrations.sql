
-- Migration: 20251103023454

-- Migration: 20251103001927

-- Migration: 20251102153232

-- Migration: 20251102074726

-- Migration: 20251031153611

-- Migration: 20251030152518

-- Migration: 20251020150506
-- 创建用户角色枚举
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- 创建用户资料表
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建访问码表
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建 Cloudflare 账号使用记录表
CREATE TABLE public.cloudflare_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  worker_name TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudflare_usage ENABLE ROW LEVEL SECURITY;

-- Profiles 表策略
CREATE POLICY "用户可以查看自己的资料"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "管理员可以查看所有资料"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Access codes 表策略
CREATE POLICY "用户可以查看自己的访问码"
  ON public.access_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "用户可以创建访问码申请"
  ON public.access_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有访问码"
  ON public.access_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以更新访问码"
  ON public.access_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以删除访问码"
  ON public.access_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cloudflare usage 表策略
CREATE POLICY "用户可以查看自己的使用记录"
  ON public.cloudflare_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "用户可以创建使用记录"
  ON public.cloudflare_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有使用记录"
  ON public.cloudflare_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 创建触发器函数：新用户自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建索引
CREATE INDEX idx_access_codes_user_id ON public.access_codes(user_id);
CREATE INDEX idx_access_codes_code ON public.access_codes(code);
CREATE INDEX idx_access_codes_status ON public.access_codes(status);
CREATE INDEX idx_cloudflare_usage_user_id ON public.cloudflare_usage(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Migration: 20251020150651
-- 创建用户角色枚举（如果不存在）
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建用户资料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建访问码表
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建 Cloudflare 账号使用记录表
CREATE TABLE IF NOT EXISTS public.cloudflare_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  worker_name TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudflare_usage ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON public.profiles;
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON public.profiles;
DROP POLICY IF EXISTS "用户可以查看自己的访问码" ON public.access_codes;
DROP POLICY IF EXISTS "用户可以创建访问码申请" ON public.access_codes;
DROP POLICY IF EXISTS "管理员可以查看所有访问码" ON public.access_codes;
DROP POLICY IF EXISTS "管理员可以更新访问码" ON public.access_codes;
DROP POLICY IF EXISTS "管理员可以删除访问码" ON public.access_codes;
DROP POLICY IF EXISTS "用户可以查看自己的使用记录" ON public.cloudflare_usage;
DROP POLICY IF EXISTS "用户可以创建使用记录" ON public.cloudflare_usage;
DROP POLICY IF EXISTS "管理员可以查看所有使用记录" ON public.cloudflare_usage;

-- Profiles 表策略
CREATE POLICY "用户可以查看自己的资料"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "管理员可以查看所有资料"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Access codes 表策略
CREATE POLICY "用户可以查看自己的访问码"
  ON public.access_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "用户可以创建访问码申请"
  ON public.access_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有访问码"
  ON public.access_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以更新访问码"
  ON public.access_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以删除访问码"
  ON public.access_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cloudflare usage 表策略
CREATE POLICY "用户可以查看自己的使用记录"
  ON public.cloudflare_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "用户可以创建使用记录"
  ON public.cloudflare_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有使用记录"
  ON public.cloudflare_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 创建触发器函数：新用户自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_access_codes_updated_at ON public.access_codes;

-- 为各表添加更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_access_codes_user_id ON public.access_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON public.access_codes(status);
CREATE INDEX IF NOT EXISTS idx_cloudflare_usage_user_id ON public.cloudflare_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Migration: 20251020150709
-- 修复更新时间戳触发器函数的安全问题
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- Migration: 20251030153024
-- Trigger types regeneration for remixed project
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.access_codes IS 'Access code requests and approvals';
COMMENT ON TABLE public.cloudflare_usage IS 'Cloudflare API usage tracking';


-- Migration: 20251030153054
-- Force types regeneration by updating table structure
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.access_codes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.cloudflare_usage ALTER COLUMN created_at SET DEFAULT now();






