-- Project AI Music — baseline taxonomy for a fresh Supabase database.
-- Demo content and demo accounts live in the local JSON demo store
-- (npm run setup:demo). Production content is created through the Studio.

insert into public.genres (slug, label_en, label_ar) values
  ('synthwave', 'Synthwave', 'سينثويف'),
  ('ambient', 'Ambient', 'أمبيانت'),
  ('electronic', 'Electronic', 'إلكتروني'),
  ('pop', 'Pop', 'بوب'),
  ('folk', 'Folk', 'فولك'),
  ('dabke', 'Dabke', 'دبكة'),
  ('hiphop', 'Hip-hop', 'هيب هوب'),
  ('cinematic', 'Cinematic', 'سينمائي')
on conflict (slug) do update
  set label_en = excluded.label_en,
      label_ar = excluded.label_ar,
      active = true;

insert into public.moods (slug, label_en, label_ar) values
  ('euphoric', 'Euphoric', 'نشوة'),
  ('nocturnal', 'Nocturnal', 'ليلي'),
  ('nostalgic', 'Nostalgic', 'حنين'),
  ('energetic', 'Energetic', 'حيوي'),
  ('calm', 'Calm', 'هادئ'),
  ('mysterious', 'Mysterious', 'غامض')
on conflict (slug) do update
  set label_en = excluded.label_en,
      label_ar = excluded.label_ar,
      active = true;

-- Promote the first operator to super_admin after they sign up, for example:
--
--   insert into public.staff_roles (user_id, role)
--   select id, 'super_admin' from public.profiles where handle = 'your-handle'
--   on conflict do nothing;
--
-- Staff roles are intentionally never self-granted through client RLS.