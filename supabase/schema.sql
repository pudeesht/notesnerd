-- notesnerd schema. Paste this whole file into Supabase → SQL Editor → Run.

-- ─── Notes ───────────────────────────────────────────────────────────────────
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(title) between 1 and 300),
  tags       text[] not null default '{}',
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search     tsvector
);

create index notes_search_idx  on public.notes using gin (search);
create index notes_tags_idx    on public.notes using gin (tags);
create index notes_updated_idx on public.notes (updated_at desc);

-- Keeps updated_at and the full-text search vector in sync on every write.
create function public.notes_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.search :=
       setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'B')
    || setweight(to_tsvector('english', coalesce(new.body, '')), 'C');
  return new;
end $$;

create trigger notes_before_write
before insert or update on public.notes
for each row execute function public.notes_before_write();

-- ─── Admins (who may write) ──────────────────────────────────────────────────
-- RLS on with no policies = invisible through the API. Add yourself with:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ─── Row level security: everyone reads, only admins write ───────────────────
alter table public.notes enable row level security;

create policy "anyone can read notes" on public.notes
  for select to anon, authenticated using (true);
create policy "admins insert notes" on public.notes
  for insert to authenticated with check (public.is_admin());
create policy "admins update notes" on public.notes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete notes" on public.notes
  for delete to authenticated using (public.is_admin());

-- ─── Search & tags ───────────────────────────────────────────────────────────
-- Full-text search (ranked) plus substring fallback so "lru" or "dijk" still match.
create function public.search_notes(
  q            text    default '',
  tag_filter   text    default null
)
returns table (
  id uuid, title text, tags text[], snippet text,
  created_at timestamptz, updated_at timestamptz
)
language sql stable set search_path = '' as $$
  with query as (
    select nullif(trim(q), '') as raw,
           case when nullif(trim(q), '') is null then null
                else websearch_to_tsquery('english', q) end as ts
  )
  select n.id, n.title, n.tags, left(n.body, 300), n.created_at, n.updated_at
  from public.notes n, query
  where (tag_filter is null or tag_filter = any (n.tags))
    and (query.raw is null
         or n.search @@ query.ts
         or n.title ilike '%' || query.raw || '%'
         or n.body  ilike '%' || query.raw || '%'
         or exists (select 1 from unnest(n.tags) t where t ilike '%' || query.raw || '%'))
  order by case when query.raw is null then 0 else ts_rank(n.search, query.ts) end desc,
           n.updated_at desc
  limit 200;
$$;

create function public.all_tags()
returns table (tag text, count bigint)
language sql stable set search_path = '' as $$
  select t, count(*) from public.notes, unnest(tags) as t
  group by t order by count(*) desc, t;
$$;
