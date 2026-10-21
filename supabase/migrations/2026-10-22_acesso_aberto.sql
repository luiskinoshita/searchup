-- SnagMap — acesso aberto (beta)
-- Quem faz login já vira "aluno" e usa a comunidade. A lista de e-mails continua
-- existindo (para admins e para quando a assinatura entrar), e o admin pode bloquear usuários.
-- Para voltar ao modo "só lista": update public.app_settings set open_access = false;

-- 1) Configuração do app (uma linha só)
create table if not exists public.app_settings (
  id          boolean primary key default true check (id),
  open_access boolean not null default true
);
insert into public.app_settings (id, open_access) values (true, true)
on conflict (id) do update set open_access = excluded.open_access;
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create or replace function public.open_access()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select open_access from public.app_settings where id), false);
$$;

-- 2) Bloqueio de usuários
alter table public.profiles add column if not exists blocked boolean not null default false;

-- 3) Novo cadastro: entra liberado se o acesso está aberto ou se o e-mail está na lista
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.allowed_emails;
begin
  select * into a from public.allowed_emails where lower(email) = lower(new.email);
  insert into public.profiles (id, email, name, is_student, is_admin)
  values (new.id, new.email, '', (a.email is not null) or public.open_access(), coalesce(a.is_admin, false));
  return new;
end $$;

-- 4) Tirar alguém da lista não remove o acesso enquanto estiver aberto
create or replace function public.sync_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set is_student = public.open_access() and not blocked, is_admin = false
    where lower(email) = lower(old.email);
    return old;
  end if;
  update public.profiles set is_student = not blocked, is_admin = new.is_admin where lower(email) = lower(new.email);
  return new;
end $$;

-- 5) Bloqueado nunca conta como aluno (admin continua admin)
create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (is_student and not blocked) or is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_status()
returns table (email text, is_student boolean, is_admin boolean)
language sql stable security definer set search_path = public as $$
  select p.email, ((p.is_student and not p.blocked) or p.is_admin), p.is_admin from public.profiles p where p.id = auth.uid();
$$;

-- 6) Admin bloqueia/desbloqueia por e-mail
create or replace function public.admin_set_blocked(p_email text, p_blocked boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;
  update public.profiles
     set blocked = p_blocked,
         is_student = case when p_blocked then false
                           else public.open_access() or exists (select 1 from public.allowed_emails a where lower(a.email) = lower(profiles.email)) end
   where lower(email) = lower(trim(p_email)) and not is_admin;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.admin_blocked_users()
returns table (email text, name text)
language sql stable security definer set search_path = public as $$
  select p.email, p.name from public.profiles p where p.blocked and public.is_admin() order by p.email;
$$;

grant execute on function public.open_access(), public.admin_set_blocked(text, boolean), public.admin_blocked_users() to authenticated;

-- 7) Libera quem já tinha conta
update public.profiles set is_student = true where not blocked;
