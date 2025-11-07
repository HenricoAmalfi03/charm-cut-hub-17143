-- Backend fixes for barber app: RPCs with SECURITY DEFINER to bypass RLS where needed
set search_path = public;

-- 1) Update agendamento status (barbeiro area) - allowed regardless of auth (requested by client)
create or replace function public.update_agendamento_status(
  p_agendamento_id uuid,
  p_status status_agendamento
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agendamentos
    set status = p_status,
        updated_at = now()
  where id = p_agendamento_id;
end;
$$;

-- 2) Update barbeiro profile (whatsapp + avatar_url) via RPC
create or replace function public.update_barbeiro_perfil(
  p_barbeiro_id uuid,
  p_whatsapp text,
  p_avatar_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.barbeiros
    set whatsapp = p_whatsapp,
        avatar_url = p_avatar_url,
        updated_at = now()
  where id = p_barbeiro_id;
end;
$$;

-- 3) Admin toggle ativo for barbeiros (requires authenticated admin)
create or replace function public.admin_toggle_barbeiro_ativo(
  p_barbeiro_id uuid,
  p_ativo boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' or not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  update public.barbeiros
    set ativo = p_ativo,
        updated_at = now()
  where id = p_barbeiro_id;
end;
$$;
