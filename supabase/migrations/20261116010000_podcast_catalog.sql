-- Oddio Podcasts v1
-- Independent catalog: music tables and music player remain untouched.
-- Apply in the Supabase SQL editor or via the existing migration pipeline.
create table if not exists public.podcast_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.podcast_shows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  author_name text not null,
  language_code text not null default 'en',
  category_id uuid not null references public.podcast_categories(id),
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  explicit boolean not null default false,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.podcast_shows(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 200),
  description text not null default '',
  audio_object_key text check (audio_object_key is null or audio_object_key ~ '^podcasts/[a-f0-9-]+\\.(mp3|m4a|aac)$'),
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  episode_number int check (episode_number is null or episode_number > 0),
  season_number int check (season_number is null or season_number > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  explicit boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(show_id, slug),
  constraint published_episode_requires_media check (status <> 'published' or (audio_object_key is not null and published_at is not null))
);

create index if not exists idx_podcast_shows_category_status on public.podcast_shows(category_id,status);
create index if not exists idx_podcast_episodes_show_status on public.podcast_episodes(show_id,status,published_at desc);
create index if not exists idx_podcast_episodes_publication on public.podcast_episodes(published_at desc) where status = 'published';

alter table public.podcast_categories enable row level security;
alter table public.podcast_shows enable row level security;
alter table public.podcast_episodes enable row level security;

drop policy if exists "Read active podcast categories" on public.podcast_categories;
create policy "Read active podcast categories" on public.podcast_categories for select to anon,authenticated using (active);
drop policy if exists "Read public podcast shows" on public.podcast_shows;
create policy "Read public podcast shows" on public.podcast_shows for select to anon,authenticated using (status='published');
drop policy if exists "Read public podcast episodes" on public.podcast_episodes;
create policy "Read public podcast episodes" on public.podcast_episodes for select to anon,authenticated using (
  status='published' and published_at <= now()
  and exists (select 1 from public.podcast_shows s where s.id=show_id and s.status='published')
);

-- Seed real, taxonomic categories only. No fictional shows or episodes.
insert into public.podcast_categories(slug,name_en,name_ar,description_en,description_ar,sort_order)
values
('technology','Technology','تكنولوجيا','Technology, innovation and digital life.','التكنولوجيا والابتكار والحياة الرقمية.',10),
('business','Business','أعمال','Entrepreneurship, finance and work.','ريادة الأعمال والاقتصاد والعمل.',20),
('education','Education','تعليم','Learning, skills and practical knowledge.','التعلم والمهارات والمعرفة العملية.',30),
('science','Science','علوم','Science, discoveries and research.','العلوم والاكتشافات والأبحاث.',40),
('culture','Culture','ثقافة','Arts, society and ideas.','الفنون والمجتمع والأفكار.',50),
('comedy','Comedy','كوميديا','Humor, entertainment and funny conversations.','الضحك والترفيه والحوارات الكوميدية.',60),
('stories','Stories','قصص وحكايات','Narratives, fiction and real-life stories.','القصص والحكايات والتجارب.',70),
('health','Health & Wellness','صحة وحياة','Wellness and health conversations.','نقاشات الصحة والعافية.',80),
('news','News & Society','أخبار ومجتمع','Current events and society.','الأخبار والأحداث والمجتمع.',90),
('sports','Sports','رياضة','Sports, teams and athletes.','الرياضة والفرق واللاعبين.',100),
('music','Music & Arts','موسيقى وفنون','Musicians, creativity and the arts.','الفنانين والإبداع والفنون.',110)
on conflict (slug) do update set name_en=excluded.name_en,name_ar=excluded.name_ar,description_en=excluded.description_en,description_ar=excluded.description_ar,sort_order=excluded.sort_order;
