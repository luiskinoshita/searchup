-- =====================================================================
-- SnagMap — banco de dados (Supabase)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Rode uma vez só, num projeto novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lista de e-mails liberados (alunos do curso)
-- ---------------------------------------------------------------------
create table public.allowed_emails (
  email      text primary key,
  is_admin   boolean not null default false,
  added_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Perfis
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  name             text not null default '' check (char_length(name) <= 60),
  prefecture       text not null default '' check (char_length(prefecture) <= 20),
  categories       text[] not null default '{}',
  bio              text not null default '' check (char_length(bio) <= 400),
  visible          boolean not null default true,
  buys_for_others  boolean not null default false,
  fee_type         text not null default 'pct' check (fee_type in ('pct','fix')),
  fee_value        numeric not null default 10 check (fee_value >= 0 and fee_value <= 1000000),
  fee_note         text not null default '' check (char_length(fee_note) <= 300),
  is_student       boolean not null default false,
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.allowed_emails;
begin
  select * into a from public.allowed_emails where lower(email) = lower(new.email);
  insert into public.profiles (id, email, name, is_student, is_admin)
  values (new.id, new.email, '', a.email is not null, coalesce(a.is_admin, false));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Quando o admin adiciona/remove um e-mail da lista, atualiza o perfil
create or replace function public.sync_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set is_student = false, is_admin = false where lower(email) = lower(old.email);
    return old;
  end if;
  update public.profiles set is_student = true, is_admin = new.is_admin where lower(email) = lower(new.email);
  return new;
end $$;

create trigger on_allowed_email_change
  after insert or update or delete on public.allowed_emails
  for each row execute procedure public.sync_allowed_email();

-- Funções de checagem
create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_student or is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_status()
returns table (email text, is_student boolean, is_admin boolean)
language sql stable security definer set search_path = public as $$
  select p.email, (p.is_student or p.is_admin), p.is_admin from public.profiles p where p.id = auth.uid();
$$;

-- distância em km (fórmula de haversine)
create or replace function public.km_between(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ---------------------------------------------------------------------
-- 3. Ofertas compartilhadas
-- ---------------------------------------------------------------------
create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  product        text not null check (char_length(product) between 2 and 140),
  category       text not null check (char_length(category) <= 30),
  store_name     text not null check (char_length(store_name) between 1 and 100),
  city_label     text not null default '' check (char_length(city_label) <= 60),
  lat            float8 not null check (lat between 20 and 50),
  lng            float8 not null check (lng between 120 and 155),
  price          integer not null check (price > 0),
  regular_price  integer check (regular_price is null or regular_price >= 0),
  note           text not null default '' check (char_length(note) <= 500),
  photo_path     text,
  created_at     timestamptz not null default now(),
  release_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '48 hours'
);
create index offers_expires_idx on public.offers (expires_at);

create table public.offer_votes (
  offer_id  uuid not null references public.offers(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  vote      text not null check (vote in ('ok','no')),
  created_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);

-- Publicar oferta (o servidor calcula liberação e validade)
create or replace function public.create_offer(
  p_product text, p_category text, p_store_name text, p_city_label text,
  p_lat float8, p_lng float8, p_price integer, p_regular_price integer,
  p_note text, p_photo_path text, p_delay_hours integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_student() then raise exception 'Apenas alunos podem publicar ofertas'; end if;
  if p_delay_hours not in (0, 12, 24) then raise exception 'Atraso inválido'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Foto inválida';
  end if;
  insert into public.offers (author_id, product, category, store_name, city_label, lat, lng, price,
                             regular_price, note, photo_path, release_at, expires_at)
  values (auth.uid(), trim(p_product), p_category, trim(p_store_name), coalesce(p_city_label, ''),
          p_lat, p_lng, p_price, nullif(p_regular_price, 0), coalesce(trim(p_note), ''), p_photo_path,
          now() + make_interval(hours => p_delay_hours),
          now() + make_interval(hours => p_delay_hours + 48))
  returning id into new_id;
  return new_id;
end $$;

-- Feed de ofertas dentro do raio
create or replace function public.feed_offers(p_lat float8, p_lng float8, p_radius_km float8, p_category text default null)
returns table (
  id uuid, author_id uuid, author_name text, author_prefecture text,
  product text, category text, store_name text, city_label text, lat float8, lng float8,
  price integer, regular_price integer, note text, photo_path text,
  created_at timestamptz, release_at timestamptz, expires_at timestamptz,
  distance_km float8, votes_ok integer, votes_no integer, my_vote text)
language sql stable security definer set search_path = public as $$
  select o.id, o.author_id, pr.name, pr.prefecture,
         o.product, o.category, o.store_name, o.city_label, o.lat, o.lng,
         o.price, o.regular_price, o.note, o.photo_path,
         o.created_at, o.release_at, o.expires_at,
         public.km_between(p_lat, p_lng, o.lat, o.lng),
         (select count(*) from public.offer_votes v where v.offer_id = o.id and v.vote = 'ok')::int,
         (select count(*) from public.offer_votes v where v.offer_id = o.id and v.vote = 'no')::int,
         (select v.vote from public.offer_votes v where v.offer_id = o.id and v.user_id = auth.uid())
  from public.offers o
  join public.profiles pr on pr.id = o.author_id
  where public.is_student()
    and o.expires_at > now()
    and (o.release_at <= now() or o.author_id = auth.uid())
    and public.km_between(p_lat, p_lng, o.lat, o.lng) <= p_radius_km
    and (p_category is null or o.category = p_category)
  order by o.created_at desc
  limit 200;
$$;

-- Resumo das ofertas que ainda vão ser liberadas (sem mostrar detalhes)
create or replace function public.pending_offers(p_lat float8, p_lng float8, p_radius_km float8)
returns table (total integer, categories text[], next_release timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*)::int, coalesce(array_agg(distinct o.category), '{}'), min(o.release_at)
  from public.offers o
  where public.is_student()
    and o.expires_at > now()
    and o.release_at > now()
    and o.author_id <> auth.uid()
    and public.km_between(p_lat, p_lng, o.lat, o.lng) <= p_radius_km;
$$;

-- Votar "ainda vale" / "acabou" (clicar de novo remove o voto)
create or replace function public.vote_offer(p_offer uuid, p_vote text)
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not public.is_student() then raise exception 'Apenas alunos'; end if;
  if p_vote not in ('ok','no') then raise exception 'Voto inválido'; end if;
  if not exists (select 1 from public.offers where id = p_offer and release_at <= now() and expires_at > now()) then
    raise exception 'Oferta indisponível';
  end if;
  select vote into cur from public.offer_votes where offer_id = p_offer and user_id = auth.uid();
  if cur = p_vote then
    delete from public.offer_votes where offer_id = p_offer and user_id = auth.uid();
  else
    insert into public.offer_votes (offer_id, user_id, vote) values (p_offer, auth.uid(), p_vote)
    on conflict (offer_id, user_id) do update set vote = excluded.vote, created_at = now();
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Conversas (solicitação -> aceitar/recusar -> mensagens)
-- ---------------------------------------------------------------------
create table public.threads (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at    timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index threads_pair_idx on public.threads (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null default '' check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or image_path is not null)
);
create index messages_thread_idx on public.messages (thread_id, created_at);

create or replace function public.request_conversation(p_recipient uuid, p_intro text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t_id uuid;
begin
  if not public.is_student() then raise exception 'Apenas alunos'; end if;
  if p_recipient = auth.uid() then raise exception 'Você não pode conversar consigo mesmo'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient and visible and (is_student or is_admin)) then
    raise exception 'Perfil indisponível';
  end if;
  if char_length(coalesce(trim(p_intro), '')) = 0 then raise exception 'Escreva uma mensagem'; end if;
  select id into t_id from public.threads
   where least(requester_id, recipient_id) = least(auth.uid(), p_recipient)
     and greatest(requester_id, recipient_id) = greatest(auth.uid(), p_recipient);
  if t_id is not null then return t_id; end if;
  insert into public.threads (requester_id, recipient_id) values (auth.uid(), p_recipient) returning id into t_id;
  insert into public.messages (thread_id, sender_id, body) values (t_id, auth.uid(), left(trim(p_intro), 500));
  return t_id;
end $$;

create or replace function public.respond_request(p_thread uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.threads set status = case when p_accept then 'accepted' else 'declined' end
   where id = p_thread and recipient_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Solicitação não encontrada'; end if;
end $$;

-- Lista de conversas com dados da outra pessoa
create or replace function public.my_threads()
returns table (
  id uuid, status text, incoming boolean, created_at timestamptz,
  other_id uuid, other_name text, other_prefecture text, other_categories text[],
  other_buys boolean, other_fee_type text, other_fee_value numeric,
  last_body text, last_at timestamptz, last_from_me boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.status, t.recipient_id = auth.uid(), t.created_at,
         o.id, o.name, o.prefecture, o.categories, o.buys_for_others, o.fee_type, o.fee_value,
         coalesce(nullif(m.body, ''), case when m.image_path is not null then 'Foto' end), m.created_at, m.sender_id = auth.uid()
  from public.threads t
  join public.profiles o on o.id = case when t.requester_id = auth.uid() then t.recipient_id else t.requester_id end
  left join lateral (
    select body, image_path, created_at, sender_id from public.messages
     where thread_id = t.id order by created_at desc limit 1) m on true
  where auth.uid() in (t.requester_id, t.recipient_id)
    and not (t.status = 'declined' and t.recipient_id = auth.uid())
  order by coalesce(m.created_at, t.created_at) desc;
$$;

-- ---------------------------------------------------------------------
-- 4b. Mural da comunidade (posts com foto)
-- ---------------------------------------------------------------------
create table public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category    text not null default 'Outros' check (char_length(category) <= 30),
  body        text not null default '' check (char_length(body) <= 1000),
  image_path  text,
  created_at  timestamptz not null default now(),
  check (char_length(body) > 0 or image_path is not null)
);
create index community_posts_created_idx on public.community_posts (created_at desc);

create or replace function public.community_feed(p_category text default null, p_before timestamptz default null)
returns table (id uuid, author_id uuid, author_name text, author_prefecture text, author_visible boolean,
               category text, body text, image_path text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.author_id, pr.name, pr.prefecture, pr.visible, c.category, c.body, c.image_path, c.created_at
  from public.community_posts c
  join public.profiles pr on pr.id = c.author_id
  where public.is_student()
    and (p_category is null or c.category = p_category)
    and (p_before is null or c.created_at < p_before)
  order by c.created_at desc
  limit 50;
$$;

-- ---------------------------------------------------------------------
-- 4c. Achados (lojas e produtos novos que os alunos encontraram)
-- ---------------------------------------------------------------------
create table public.finds (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('loja','produto')),
  title       text not null check (char_length(title) between 2 and 120),
  category    text not null default 'Outros' check (char_length(category) <= 30),
  note        text not null default '' check (char_length(note) <= 1000),
  address     text not null default '' check (char_length(address) <= 200),
  place_label text not null default '' check (char_length(place_label) <= 100),
  lat         float8 check (lat is null or lat between 20 and 50),
  lng         float8 check (lng is null or lng between 120 and 155),
  price       integer check (price is null or price > 0),
  image_path  text,
  created_at  timestamptz not null default now(),
  check (kind <> 'loja' or (lat is not null and lng is not null))
);
create index finds_created_idx on public.finds (created_at desc);

create table public.find_likes (
  find_id    uuid not null references public.finds(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (find_id, user_id)
);

-- Achados no raio (produtos sem local aparecem para todos)
create or replace function public.finds_feed(p_lat float8, p_lng float8, p_radius_km float8,
                                             p_kind text default null, p_category text default null)
returns table (id uuid, author_id uuid, author_name text, author_prefecture text, author_visible boolean,
               kind text, title text, category text, note text, address text, place_label text,
               lat float8, lng float8, price integer, image_path text, created_at timestamptz,
               distance_km float8, likes integer, liked boolean)
language sql stable security definer set search_path = public as $$
  select f.id, f.author_id, pr.name, pr.prefecture, pr.visible,
         f.kind, f.title, f.category, f.note, f.address, f.place_label,
         f.lat, f.lng, f.price, f.image_path, f.created_at,
         case when f.lat is null then null else public.km_between(p_lat, p_lng, f.lat, f.lng) end,
         (select count(*) from public.find_likes l where l.find_id = f.id)::int,
         exists (select 1 from public.find_likes l where l.find_id = f.id and l.user_id = auth.uid())
  from public.finds f
  join public.profiles pr on pr.id = f.author_id
  where public.is_student()
    and (p_kind is null or f.kind = p_kind)
    and (p_category is null or f.category = p_category)
    and (f.lat is null or public.km_between(p_lat, p_lng, f.lat, f.lng) <= p_radius_km)
  order by f.created_at desc
  limit 200;
$$;

-- Marcar/desmarcar "útil"
create or replace function public.like_find(p_find uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_student() then raise exception 'Apenas alunos'; end if;
  if exists (select 1 from public.find_likes where find_id = p_find and user_id = auth.uid()) then
    delete from public.find_likes where find_id = p_find and user_id = auth.uid();
  else
    insert into public.find_likes (find_id, user_id) values (p_find, auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Denúncias
-- ---------------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_user  uuid references public.profiles(id) on delete cascade,
  offer_id     uuid references public.offers(id) on delete cascade,
  thread_id    uuid references public.threads(id) on delete cascade,
  post_id      uuid references public.community_posts(id) on delete cascade,
  find_id      uuid references public.finds(id) on delete cascade,
  reason       text not null default '' check (char_length(reason) <= 500),
  created_at   timestamptz not null default now()
);

create or replace function public.report(p_target_user uuid, p_offer uuid, p_thread uuid, p_reason text,
                                         p_post uuid default null, p_find uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  insert into public.reports (reporter_id, target_user, offer_id, thread_id, post_id, find_id, reason)
  values (auth.uid(), p_target_user, p_offer, p_thread, p_post, p_find, coalesce(p_reason, ''));
end $$;

create or replace function public.admin_reports()
returns table (id uuid, created_at timestamptz, reason text, reporter_name text, target_name text, target_email text,
               offer_id uuid, offer_product text, thread_id uuid, post_id uuid, post_body text,
               find_id uuid, find_title text)
language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, r.reason, rp.name, tp.name, tp.email, r.offer_id, o.product, r.thread_id,
         r.post_id, cp.body, r.find_id, fd.title
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_user
  left join public.offers o on o.id = r.offer_id
  left join public.community_posts cp on cp.id = r.post_id
  left join public.finds fd on fd.id = r.find_id
  where public.is_admin()
  order by r.created_at desc limit 200;
$$;

-- ---------------------------------------------------------------------
-- 6. Segurança (RLS) e permissões
-- ---------------------------------------------------------------------
alter table public.allowed_emails enable row level security;
alter table public.profiles       enable row level security;
alter table public.offers         enable row level security;
alter table public.offer_votes    enable row level security;
alter table public.threads        enable row level security;
alter table public.messages       enable row level security;
alter table public.reports        enable row level security;
alter table public.community_posts enable row level security;
alter table public.finds          enable row level security;
alter table public.find_likes     enable row level security;

revoke all on public.allowed_emails, public.profiles, public.offers, public.offer_votes,
              public.threads, public.messages, public.reports, public.community_posts,
              public.finds, public.find_likes from anon, authenticated;

-- allowed_emails: só admin
grant select, insert, update, delete on public.allowed_emails to authenticated;
create policy "admin gerencia lista" on public.allowed_emails for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: alunos veem perfis visíveis de alunos; cada um edita o seu
grant select (id, name, prefecture, categories, bio, visible, buys_for_others, fee_type, fee_value, fee_note, is_student, created_at)
  on public.profiles to authenticated;
grant update (name, prefecture, categories, bio, visible, buys_for_others, fee_type, fee_value, fee_note)
  on public.profiles to authenticated;
create policy "ver perfis" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or (public.is_student() and visible and is_student));
create policy "editar meu perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- offers: leitura pelas funções acima; o autor ou admin pode apagar
grant select, delete on public.offers to authenticated;
create policy "minhas ofertas" on public.offers for select to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "apagar oferta" on public.offers for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- threads e messages: só os participantes
grant select on public.threads to authenticated;
create policy "participantes veem conversa" on public.threads for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));

grant select on public.messages to authenticated;
grant insert (thread_id, body, image_path) on public.messages to authenticated;
create policy "participantes leem mensagens" on public.messages for select to authenticated
  using (exists (select 1 from public.threads t where t.id = thread_id and auth.uid() in (t.requester_id, t.recipient_id)));
create policy "participantes enviam mensagens" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.threads t where t.id = thread_id and t.status = 'accepted'
      and auth.uid() in (t.requester_id, t.recipient_id))
    and (image_path is null or (split_part(image_path, '/', 1) = thread_id::text
                                and split_part(image_path, '/', 2) = auth.uid()::text)));

-- mural: alunos leem pela função community_feed; publicam e apagam o que é seu
grant select, delete on public.community_posts to authenticated;
grant insert (category, body, image_path) on public.community_posts to authenticated;
create policy "alunos veem mural" on public.community_posts for select to authenticated
  using (public.is_student());
create policy "alunos publicam no mural" on public.community_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_student()
              and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text));
create policy "apagar post" on public.community_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- achados: leitura pela função finds_feed; alunos publicam; autor ou admin apaga
grant select, delete on public.finds to authenticated;
grant insert (kind, title, category, note, address, place_label, lat, lng, price, image_path) on public.finds to authenticated;
create policy "alunos veem achados" on public.finds for select to authenticated
  using (public.is_student());
create policy "alunos publicam achados" on public.finds for insert to authenticated
  with check (author_id = auth.uid() and public.is_student()
              and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text));
create policy "apagar achado" on public.finds for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- funções: só usuários logados
revoke execute on all functions in schema public from anon, public;
grant execute on function public.is_student(), public.is_admin(), public.my_status(),
  public.km_between(float8, float8, float8, float8),
  public.create_offer(text, text, text, text, float8, float8, integer, integer, text, text, integer),
  public.feed_offers(float8, float8, float8, text), public.pending_offers(float8, float8, float8),
  public.vote_offer(uuid, text), public.request_conversation(uuid, text),
  public.respond_request(uuid, boolean), public.my_threads(),
  public.report(uuid, uuid, uuid, text, uuid, uuid), public.admin_reports(),
  public.community_feed(text, timestamptz),
  public.finds_feed(float8, float8, float8, text, text), public.like_find(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- 7. Fotos das etiquetas (armazenamento privado, só alunos veem)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-photos', 'offer-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "alunos veem fotos" on storage.objects for select to authenticated
  using (bucket_id = 'offer-photos' and public.is_student());
create policy "alunos enviam fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'offer-photos' and public.is_student()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "dono apaga foto" on storage.objects for delete to authenticated
  using (bucket_id = 'offer-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fotos do mural: só alunos veem; cada um envia na própria pasta
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-photos', 'community-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "alunos veem fotos do mural" on storage.objects for select to authenticated
  using (bucket_id = 'community-photos' and public.is_student());
create policy "alunos enviam fotos do mural" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-photos' and public.is_student()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "dono apaga foto do mural" on storage.objects for delete to authenticated
  using (bucket_id = 'community-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fotos dos achados: só alunos veem; cada um envia na própria pasta
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('find-photos', 'find-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "alunos veem fotos dos achados" on storage.objects for select to authenticated
  using (bucket_id = 'find-photos' and public.is_student());
create policy "alunos enviam fotos dos achados" on storage.objects for insert to authenticated
  with check (bucket_id = 'find-photos' and public.is_student()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "dono apaga foto do achado" on storage.objects for delete to authenticated
  using (bucket_id = 'find-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fotos do chat: só as duas pessoas da conversa veem (pasta = id da conversa / quem enviou)
create or replace function public.can_see_thread(p_thread text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.threads t
                  where t.id::text = p_thread and auth.uid() in (t.requester_id, t.recipient_id));
$$;
create or replace function public.can_post_thread(p_thread text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.threads t
                  where t.id::text = p_thread and t.status = 'accepted' and auth.uid() in (t.requester_id, t.recipient_id));
$$;
grant execute on function public.can_see_thread(text), public.can_post_thread(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "participantes veem fotos do chat" on storage.objects for select to authenticated
  using (bucket_id = 'chat-photos' and public.can_see_thread((storage.foldername(name))[1]));
create policy "participantes enviam fotos no chat" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-photos' and public.can_post_thread((storage.foldername(name))[1])
              and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 7b. Limite diário de buscas no Google (para não sair da cota grátis)
-- ---------------------------------------------------------------------
create table public.api_usage (
  day   date not null,
  api   text not null,
  count integer not null default 0,
  primary key (day, api)
);
alter table public.api_usage enable row level security;
revoke all on public.api_usage from anon, authenticated;

create or replace function public.consume_api_quota(p_api text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  if p_api not in ('google_places') then return false; end if;
  insert into public.api_usage (day, api, count)
  values ((now() at time zone 'Asia/Tokyo')::date, p_api, 1)
  on conflict (day, api) do update set count = public.api_usage.count + 1
  returning count into c;
  return c <= p_limit;
end $$;
grant execute on function public.consume_api_quota(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Chat em tempo real
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- 9. Você como administrador (troque o e-mail se usar outro no app)
-- ---------------------------------------------------------------------
insert into public.allowed_emails (email, is_admin) values ('kinoshita.lu10@gmail.com', true)
on conflict (email) do update set is_admin = true;
