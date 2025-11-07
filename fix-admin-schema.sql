-- =====================================================
-- FIX PARA ERRO DE SCHEMA CACHE
-- =====================================================
-- Este script corrige problemas de permissões e garante
-- que admins possam criar barbeiros corretamente

-- Garantir que a função create_barbeiro tem as permissões corretas
GRANT EXECUTE ON FUNCTION public.create_barbeiro(TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_cliente(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_barbeiro(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_cliente(TEXT, TEXT) TO anon, authenticated;

-- Garantir que admins têm acesso total às tabelas
GRANT ALL ON public.barbeiros TO authenticated;
GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.servicos TO authenticated;
GRANT ALL ON public.agendamentos TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Atualizar políticas para garantir acesso total aos admins
DROP POLICY IF EXISTS "Admins can manage all barbeiros" ON public.barbeiros;
CREATE POLICY "Admins can manage all barbeiros"
ON public.barbeiros FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Garantir que a função is_admin está acessível
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, anon;

-- Refresh do schema cache
NOTIFY pgrst, 'reload schema';
