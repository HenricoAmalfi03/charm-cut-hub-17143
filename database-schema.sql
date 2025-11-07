-- =====================================================
-- BARBEARIA PREMIUM - SCHEMA UNIVERSAL (SEM PGCRYPTO)
-- =====================================================
-- Execute este ANTES do storage-setup.sql

-- =============================
-- CLEANUP (se existir)
-- =============================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_barbeiros_updated_at ON public.barbeiros;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
DROP TRIGGER IF EXISTS update_servicos_updated_at ON public.servicos;
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON public.agendamentos;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.create_barbeiro(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_cliente(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_barbeiro(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_cliente(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.barbeiros CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.status_agendamento CASCADE;

-- =============================
-- EXTENSIONS
-- =============================
-- NÃO USAR: CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================
-- TYPES
-- =============================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.status_agendamento AS ENUM (
  'pendente', 'confirmado', 'em_andamento', 'finalizado', 'cancelado', 'nao_compareceu'
);

-- =============================
-- TABELA: profiles
-- =============================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABELA: user_roles
-- =============================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABELA: clientes
-- =============================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABELA: barbeiros
-- =============================
CREATE TABLE public.barbeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  horario_inicio TIME DEFAULT '09:00',
  horario_fim TIME DEFAULT '18:00',
  dias_trabalho INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=domingo, 6=sábado
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABELA: servicos
-- =============================
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABELA: agendamentos
-- =============================
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  barbeiro_id UUID REFERENCES public.barbeiros(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE CASCADE NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  status status_agendamento DEFAULT 'pendente',
  observacoes TEXT,
  valor_pago DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- =============================
-- FUNCTIONS: Utilitárias
-- =============================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT public.has_role(_user_id, 'admin')
$$;

-- =============================
-- FUNCTIONS: Criar Barbeiro
-- =============================

CREATE OR REPLACE FUNCTION public.create_barbeiro(
    p_nome TEXT,
    p_email TEXT,
    p_senha TEXT,
    p_telefone TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_barbeiro_id UUID;
BEGIN
    -- Validações
    IF p_nome IS NULL OR p_nome = '' THEN
        RAISE EXCEPTION 'Nome é obrigatório';
    END IF;
    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'Email é obrigatório';
    END IF;
    IF p_senha IS NULL OR LENGTH(p_senha) < 6 THEN
        RAISE EXCEPTION 'Senha deve ter no mínimo 6 caracteres';
    END IF;

    -- Criar barbeiro (senha em texto puro)
    INSERT INTO public.barbeiros (
        nome_completo, email, senha_hash, telefone
    ) VALUES (
        p_nome, LOWER(TRIM(p_email)), p_senha, p_telefone
    )
    RETURNING id INTO v_barbeiro_id;

    RETURN v_barbeiro_id;
END;
$$;

-- =============================
-- FUNCTIONS: Criar Cliente
-- =============================

CREATE OR REPLACE FUNCTION public.create_cliente(
    p_nome TEXT,
    p_email TEXT,
    p_senha TEXT,
    p_telefone TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_cliente_id UUID;
BEGIN
    -- Validações
    IF p_nome IS NULL OR p_nome = '' THEN
        RAISE EXCEPTION 'Nome é obrigatório';
    END IF;
    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'Email é obrigatório';
    END IF;
    IF p_senha IS NULL OR LENGTH(p_senha) < 6 THEN
        RAISE EXCEPTION 'Senha deve ter no mínimo 6 caracteres';
    END IF;

    -- Criar cliente (senha em texto puro)
    INSERT INTO public.clientes (
        nome_completo, email, senha_hash, telefone
    ) VALUES (
        p_nome, LOWER(TRIM(p_email)), p_senha, p_telefone
    )
    RETURNING id INTO v_cliente_id;

    RETURN v_cliente_id;
END;
$$;

-- =============================
-- FUNCTIONS: Autenticar Barbeiro
-- =============================

CREATE OR REPLACE FUNCTION public.authenticate_barbeiro(
    p_email TEXT,
    p_senha TEXT
) RETURNS TABLE (
    id UUID,
    nome_completo TEXT,
    email TEXT,
    telefone TEXT,
    avatar_url TEXT,
    especialidades TEXT[],
    ativo BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
        SELECT b.id, b.nome_completo, b.email, b.telefone, b.avatar_url, b.especialidades, b.ativo
        FROM public.barbeiros b
        WHERE b.email = LOWER(TRIM(p_email))
          AND b.senha_hash = p_senha -- comparação direta!
          AND b.ativo = TRUE;
END;
$$;

-- =============================
-- FUNCTIONS: Autenticar Cliente
-- =============================

CREATE OR REPLACE FUNCTION public.authenticate_cliente(
    p_email TEXT,
    p_senha TEXT
) RETURNS TABLE (
    id UUID,
    nome_completo TEXT,
    email TEXT,
    telefone TEXT,
    avatar_url TEXT,
    ativo BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
        SELECT c.id, c.nome_completo, c.email, c.telefone, c.avatar_url, c.ativo
        FROM public.clientes c
        WHERE c.email = LOWER(TRIM(p_email))
          AND c.senha_hash = p_senha -- comparação direta!
          AND c.ativo = TRUE;
END;
$$;

-- =============================
-- FUNCTION: Handle New Admin User (Supabase Auth)
-- =============================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Criar profile
    INSERT INTO public.profiles (id, full_name)
        VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    -- Atribuir role admin
    INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    RETURN NEW;
END;
$$;

-- =============================
-- TRIGGERS
-- =============================

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_barbeiros_updated_at BEFORE UPDATE ON public.barbeiros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================
-- RLS POLICIES
-- =============================

-- PROFILES: Apenas o próprio usuário e admins
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- USER_ROLES: Apenas admins podem gerenciar
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- CLIENTES: Acesso público para leitura e criação; admins podem gerenciar tudo.
CREATE POLICY "Public can view active clientes"
ON public.clientes FOR SELECT TO public USING (ativo = TRUE);
CREATE POLICY "Anyone can create cliente"
ON public.clientes FOR INSERT TO public WITH CHECK (TRUE);
CREATE POLICY "Admins can manage clientes"
ON public.clientes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- BARBEIROS: Acesso público para leitura; admins podem gerenciar tudo.
CREATE POLICY "Public can view active barbeiros"
ON public.barbeiros FOR SELECT TO public USING (ativo = TRUE);
CREATE POLICY "Admins can manage barbeiros"
ON public.barbeiros FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SERVICOS: Acesso público para leitura; admins podem gerenciar tudo.
CREATE POLICY "Public can view active servicos"
ON public.servicos FOR SELECT TO public USING (ativo = TRUE);
CREATE POLICY "Admins can insert servicos"
ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update servicos"
ON public.servicos FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete servicos"
ON public.servicos FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- AGENDAMENTOS: Clientes veem seus próprios; admins veem tudo.
CREATE POLICY "Public can view agendamentos"
ON public.agendamentos FOR SELECT TO public USING (TRUE);
CREATE POLICY "Public can create agendamentos"
ON public.agendamentos FOR INSERT TO public WITH CHECK (TRUE);
CREATE POLICY "Admins can manage all agendamentos"
ON public.agendamentos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =============================
-- GRANTS
-- =============================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================
-- DADOS INICIAIS - SERVIÇOS PADRÃO
-- =============================

INSERT INTO public.servicos (nome, descricao, preco, duracao_minutos, ativo) VALUES 
('Corte Simples', 'Corte de cabelo tradicional', 35.00, 30, TRUE),
('Corte + Barba', 'Corte de cabelo e aparar barba', 55.00, 45, TRUE),
('Barba Completa', 'Modelagem e finalização da barba', 30.00, 30, TRUE),
('Corte Premium', 'Corte com toalha quente e massagem', 65.00, 60, TRUE),
('Sobrancelha', 'Design de sobrancelhas', 15.00, 15, TRUE)
ON CONFLICT DO NOTHING;
