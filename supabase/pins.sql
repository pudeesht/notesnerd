-- notesnerd pinned notes. Paste into Supabase → SQL Editor → Run (after schema.sql). Safe to re-run.

alter table public.notes add column if not exists pinned_at timestamptz;

create index if not exists notes_pinned_idx on public.notes (pinned_at) where pinned_at is not null;

-- Only bump updated_at when the content changes, so pinning doesn't reshuffle "Updated" dates.
create or replace function public.notes_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.tags  is distinct from old.tags
     or new.body  is distinct from old.body then
    new.updated_at := now();
  end if;
  new.search :=
       setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'B')
    || setweight(to_tsvector('english', coalesce(new.body, '')), 'C');
  return new;
end $$;

-- At most 3 pinned notes.
create or replace function public.notes_pin_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.pinned_at is not null and (tg_op = 'INSERT' or old.pinned_at is null) then
    if (select count(*) from public.notes where pinned_at is not null and id <> new.id) >= 3 then
      raise exception 'You can pin up to 3 notes. Unpin one first.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists notes_pin_limit on public.notes;
create trigger notes_pin_limit
before insert or update of pinned_at on public.notes
for each row execute function public.notes_pin_limit();
