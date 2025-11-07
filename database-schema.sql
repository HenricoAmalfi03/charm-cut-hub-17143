-- =====================================================
-- BARBEARIA PREMIUM - DATABASE SCHEMA
-- =====================================================
-- Setup completo e idempotente (pode executar múltiplas vezes)
-- 
-- ARQUITETURA DE SEGURANÇA:
-- 1. ADMIN: auth.users + user_roles (role='admin')
-- 2. BARBEIROS: tabela própria com senha hash (login customizado)
-- 3. CLIENTES: tabela própria com senha hash (login customizado)
-- =====================================================

-- =============================
-- PARTE 1: LIMPEZA COMPLETA
-- =============================

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes CASCADE;
DROP TRIGGER IF EXISTS update_barbeiros_updated_at ON public.barbeiros CASCADE;
DROP TRIGGER IF EXISTS update_servicos_updated_at ON public.servicos CASCADE;
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON public.agendamentos CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.create_barbeiro(text, text, text, text, text[], boolean) CASCADE;
DROP FUNCTION IF EXISTS public.create_cliente(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_barbeiro(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_cliente(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop tables (ordem importa por foreign keys)
DROP TABLE IF EXISTS public.interacoes CASCADE;
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.barbeiros CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.status_agendamento CASCADE;
DROP TYPE IF EXISTS public.tipo_interacao CASCADE;

-- =============================
-- PARTE 2: EXTENSÕES E TIPOS
-- =============================

-- Habilitar extensão para criptografia (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipos personalizados
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.status_agendamento AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado');
CREATE TYPE public.tipo_interacao AS ENUM ('ligacao', 'whatsapp', 'email', 'visita');

-- =============================
-- PARTE 3: TABELAS
-- =============================

-- 3.1 Perfis dos Administradores (ligados a auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Administrador',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.profiles IS 'Perfis dos administradores (auth.users)';

-- 3.2 Roles de Usuários (SEGURANÇA CRÍTICA)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.user_roles IS 'Roles dos usuários - NUNCA armazene roles na tabela de perfis!';
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 3.3 Clientes (login separado, NÃO auth.users)
CREATE TABLE public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT clientes_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT clientes_telefone_not_empty CHECK (telefone <> '')
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.clientes IS 'Clientes da barbearia com autenticação própria';
CREATE INDEX idx_clientes_email ON public.clientes(email);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);

-- 3.4 Barbeiros (login separado, NÃO auth.users)
CREATE TABLE public.barbeiros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp TEXT,
  avatar_url TEXT,
  especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  horario_inicio TIME DEFAULT '09:00',
  horario_fim TIME DEFAULT '18:00',
  dias_trabalho INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=domingo, 6=sábado
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT barbeiros_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT barbeiros_telefone_not_empty CHECK (telefone <> ''),
  CONSTRAINT barbeiros_horario_valido CHECK (horario_inicio < horario_fim)
);

ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.barbeiros IS 'Barbeiros com autenticação própria';
CREATE INDEX idx_barbeiros_email ON public.barbeiros(email);
CREATE INDEX idx_barbeiros_ativo ON public.barbeiros(ativo);

-- 3.5 Serviços oferecidos
CREATE TABLE public.servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT servicos_preco_positivo CHECK (preco > 0),
  CONSTRAINT servicos_duracao_positiva CHECK (duracao_minutos > 0),
  CONSTRAINT servicos_nome_not_empty CHECK (nome <> '')
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.servicos IS 'Serviços oferecidos pela barbearia';
CREATE INDEX idx_servicos_ativo ON public.servicos(ativo);
CREATE INDEX idx_servicos_nome ON public.servicos(nome);

-- 3.6 Agendamentos
CREATE TABLE public.agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  barbeiro_id UUID REFERENCES public.barbeiros(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE CASCADE NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  status public.status_agendamento DEFAULT 'agendado' NOT NULL,
  observacoes TEXT,
  valor_pago DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT agendamentos_data_futura CHECK (data_hora > created_at),
  CONSTRAINT agendamentos_valor_positivo CHECK (valor_pago IS NULL OR valor_pago >= 0)
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.agendamentos IS 'Agendamentos de serviços';
CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_barbeiro ON public.agendamentos(barbeiro_id);
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_hora);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);

-- 3.7 Interações CRM
CREATE TABLE public.interacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  tipo public.tipo_interacao NOT NULL,
  descricao TEXT NOT NULL,
  data TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT interacoes_descricao_not_empty CHECK (descricao <> '')
);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.interacoes IS 'Histórico de interações CRM com clientes';
CREATE INDEX idx_interacoes_cliente ON public.interacoes(cliente_id);
CREATE INDEX idx_interacoes_data ON public.interacoes(data);

-- =============================
-- PARTE 4: FUNÇÕES DE SEGURANÇA
-- =============================

-- 4.1 Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4.2 Verificar role do usuário (SECURITY DEFINER - evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

COMMENT ON FUNCTION public.has_role IS 'Verifica se usuário tem role específica (SECURITY DEFINER evita recursão RLS)';

-- 4.3 Verificar se usuário é admin (usa has_role)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

COMMENT ON FUNCTION public.is_admin IS 'Verifica se usuário é admin';

-- =============================
-- PARTE 5: FUNÇÕES DE NEGÓCIO
-- =============================

-- 5.1 Criar barbeiro com senha hash (apenas admin)
CREATE OR REPLACE FUNCTION public.create_barbeiro(
  p_nome TEXT,
  p_email TEXT,
  p_senha TEXT,
  p_telefone TEXT DEFAULT '',
  p_especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_ativo BOOLEAN DEFAULT TRUE
)
RETURNS public.barbeiros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbeiro public.barbeiros%ROWTYPE;
BEGIN
  -- Apenas admins podem criar barbeiros
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  -- Validações
  IF LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 3 caracteres';
  END IF;
  
  IF LENGTH(p_senha) < 6 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 6 caracteres';
  END IF;

  INSERT INTO public.barbeiros (
    nome_completo, email, senha_hash, telefone, especialidades, ativo
  ) VALUES (
    TRIM(p_nome), 
    LOWER(TRIM(p_email)), 
    crypt(p_senha, gen_salt('bf')), 
    TRIM(p_telefone), 
    p_especialidades, 
    p_ativo
  )
  RETURNING * INTO v_barbeiro;

  RETURN v_barbeiro;
END;
$$;

COMMENT ON FUNCTION public.create_barbeiro IS 'Cria barbeiro com senha hash (bcrypt) - apenas admins';
GRANT EXECUTE ON FUNCTION public.create_barbeiro(TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- 5.2 Criar cliente com senha hash
CREATE OR REPLACE FUNCTION public.create_cliente(
  p_nome TEXT,
  p_email TEXT,
  p_senha TEXT,
  p_telefone TEXT
)
RETURNS public.clientes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente public.clientes%ROWTYPE;
BEGIN
  -- Validações
  IF LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 3 caracteres';
  END IF;
  
  IF LENGTH(p_senha) < 6 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 6 caracteres';
  END IF;

  INSERT INTO public.clientes (
    nome_completo, email, senha_hash, telefone
  ) VALUES (
    TRIM(p_nome), 
    LOWER(TRIM(p_email)), 
    crypt(p_senha, gen_salt('bf')), 
    TRIM(p_telefone)
  )
  RETURNING * INTO v_cliente;

  RETURN v_cliente;
END;
$$;

COMMENT ON FUNCTION public.create_cliente IS 'Cria cliente com senha hash (bcrypt)';
GRANT EXECUTE ON FUNCTION public.create_cliente(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5.3 Autenticar barbeiro
CREATE OR REPLACE FUNCTION public.authenticate_barbeiro(
  p_email TEXT,
  p_senha TEXT
)
RETURNS TABLE (
  id UUID,
  nome_completo TEXT,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  especialidades TEXT[],
  ativo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.nome_completo,
    b.email,
    b.telefone,
    b.avatar_url,
    b.especialidades,
    b.ativo
  FROM public.barbeiros b
  WHERE b.email = LOWER(TRIM(p_email))
    AND b.senha_hash = crypt(p_senha, b.senha_hash)
    AND b.ativo = TRUE;
END;
$$;

COMMENT ON FUNCTION public.authenticate_barbeiro IS 'Autentica barbeiro por email/senha';
GRANT EXECUTE ON FUNCTION public.authenticate_barbeiro(TEXT, TEXT) TO anon, authenticated;

-- 5.4 Autenticar cliente
CREATE OR REPLACE FUNCTION public.authenticate_cliente(
  p_email TEXT,
  p_senha TEXT
)
RETURNS TABLE (
  id UUID,
  nome_completo TEXT,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nome_completo,
    c.email,
    c.telefone,
    c.avatar_url,
    c.ativo
  FROM public.clientes c
  WHERE c.email = LOWER(TRIM(p_email))
    AND c.senha_hash = crypt(p_senha, c.senha_hash)
    AND c.ativo = TRUE;
END;
$$;

COMMENT ON FUNCTION public.authenticate_cliente IS 'Autentica cliente por email/senha';
GRANT EXECUTE ON FUNCTION public.authenticate_cliente(TEXT, TEXT) TO anon, authenticated;

-- 5.5 Auto-criar profile para novos admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Dar role de admin automaticamente ao primeiro usuário
  -- Para produção, remova isso e atribua roles manualmente!
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Cria profile e role para novos auth.users';

-- =============================
-- PARTE 6: TRIGGERS
-- =============================

-- Trigger para auto-profile em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbeiros_updated_at BEFORE UPDATE ON public.barbeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================
-- PARTE 7: RLS POLICIES
-- =============================

-- 7.1 Policies para Profiles (Admins)
CREATE POLICY "Admins can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 7.2 Policies para User Roles (CRÍTICO PARA SEGURANÇA)
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7.3 Policies para Clientes
CREATE POLICY "Anyone can read active clientes"
ON public.clientes FOR SELECT
TO public
USING (ativo = TRUE);

CREATE POLICY "Admins can manage all clientes"
ON public.clientes FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7.4 Policies para Barbeiros
CREATE POLICY "Anyone can read active barbeiros"
ON public.barbeiros FOR SELECT
TO public
USING (ativo = TRUE);

CREATE POLICY "Admins can manage all barbeiros"
ON public.barbeiros FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7.5 Policies para Serviços
CREATE POLICY "Anyone can view active servicos"
ON public.servicos FOR SELECT
TO public
USING (ativo = TRUE);

CREATE POLICY "Admins can insert servicos"
ON public.servicos FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update servicos"
ON public.servicos FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete servicos"
ON public.servicos FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 7.6 Policies para Agendamentos
CREATE POLICY "Public can create agendamentos"
ON public.agendamentos FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view agendamentos"
ON public.agendamentos FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage all agendamentos"
ON public.agendamentos FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7.7 Policies para Interações
CREATE POLICY "Admins can manage interacoes"
ON public.interacoes FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =============================
-- PARTE 8: DADOS INICIAIS
-- =============================

-- Inserir serviços de exemplo
INSERT INTO public.servicos (nome, descricao, preco, duracao_minutos) 
VALUES
  ('Corte Simples', 'Corte de cabelo masculino tradicional', 30.00, 30),
  ('Corte + Barba', 'Corte de cabelo e barba completa', 50.00, 45),
  ('Barba', 'Apenas barba', 25.00, 20),
  ('Corte Degradê', 'Corte degradê moderno', 40.00, 40),
  ('Platinado', 'Descoloração completa', 100.00, 90),
  ('Hidratação', 'Hidratação capilar profunda', 60.00, 50),
  ('Coloração', 'Coloração completa', 80.00, 60)
ON CONFLICT (nome) DO NOTHING;

-- =============================
-- INSTRUÇÕES DE USO
-- =============================
-- 
-- 1. SEGURANÇA:
--    ⚠️  CRÍTICO: Roles são armazenadas em tabela separada (user_roles)
--    ⚠️  NUNCA armazene roles em profiles ou auth.users
--    ⚠️  Funções SECURITY DEFINER evitam recursão em RLS
--    ⚠️  Senhas criptografadas com bcrypt (pgcrypto)
--
-- 2. ADMINISTRADORES:
--    - Crie no Supabase Authentication
--    - Role 'admin' é atribuída automaticamente (remova em produção!)
--    - Login via rota: /admin/auth
--
-- 3. BARBEIROS:
--    - Criados pelo admin via interface
--    - Usam função create_barbeiro() com senha hash
--    - Login via rota: /barbeiro/auth
--
-- 4. CLIENTES:
--    - Auto-cadastro via interface pública
--    - Usam função create_cliente() com senha hash
--    - Login via rota: /cliente/auth
--
-- 5. STORAGE:
--    - Configurado no storage-setup.sql
--    - Bucket 'barbearia' com pastas: avatars/, servicos/
--
-- Este script é IDEMPOTENTE - pode executar múltiplas vezes!