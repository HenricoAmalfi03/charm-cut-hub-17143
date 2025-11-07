-- =============================================
-- HOTFIX: resolver PGRST002 (schema cache) e RPCs
-- =============================================
-- 1) Garantir privilégios básicos de schema e tipos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON TYPE public.app_role TO anon, authenticated;

-- 2) Recriar funções de criação para não retornarem tipo composto de tabela
--    (evita requisitos de privilégio de SELECT na tabela para introspecção)
--    Passam a retornar colunas explícitas (TABLE ...)

-- 2.1 create_barbeiro -> retorna colunas explícitas
CREATE OR REPLACE FUNCTION public.create_barbeiro(
  p_nome TEXT,
  p_email TEXT,
  p_senha TEXT,
  p_telefone TEXT DEFAULT '',
  p_especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_ativo BOOLEAN DEFAULT TRUE
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
DECLARE
  v_barbeiro public.barbeiros%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

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
    COALESCE(p_especialidades, ARRAY[]::TEXT[]), 
    COALESCE(p_ativo, TRUE)
  )
  RETURNING * INTO v_barbeiro;

  RETURN QUERY SELECT 
    v_barbeiro.id,
    v_barbeiro.nome_completo,
    v_barbeiro.email,
    v_barbeiro.telefone,
    v_barbeiro.avatar_url,
    v_barbeiro.especialidades,
    v_barbeiro.ativo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_barbeiro(TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- 2.2 create_cliente -> retorna colunas explícitas
CREATE OR REPLACE FUNCTION public.create_cliente(
  p_nome TEXT,
  p_email TEXT,
  p_senha TEXT,
  p_telefone TEXT
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
DECLARE
  v_cliente public.clientes%ROWTYPE;
BEGIN
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

  RETURN QUERY SELECT 
    v_cliente.id,
    v_cliente.nome_completo,
    v_cliente.email,
    v_cliente.telefone,
    v_cliente.avatar_url,
    v_cliente.ativo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cliente(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3) Garantir RPCs de autenticação acessíveis
GRANT EXECUTE ON FUNCTION public.authenticate_barbeiro(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_cliente(TEXT, TEXT) TO anon, authenticated;

-- 4) Forçar reload do schema do PostgREST
NOTIFY pgrst, 'reload schema';
