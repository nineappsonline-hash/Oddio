-- Search aliases are artist-supplied spellings, never inferred from a name.
-- Apply only after testing on disposable/staging PostgreSQL, not production.
alter table public.artists
  add column if not exists search_aliases text[] not null default '{}';

alter table public.artists
  add constraint oddio_search_aliases_max
  check (
    coalesce(array_length(search_aliases, 1), 0) <= 8
    and array_to_string(search_aliases, '') !~ '[[:cntrl:]]'
  );
