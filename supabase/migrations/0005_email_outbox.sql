-- Project AI Music — consent-based email notification outbox.
--
-- In-app notifications are always written to public.notifications. This
-- migration adds an outbox populated only when the recipient has opted in to
-- email. Delivery is performed by the media worker through a transactional
-- claim/complete/fail protocol, never inline with a web request.

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null unique references public.notifications (id) on delete cascade,
  to_email text not null,
  locale public.locale_code not null default 'en',
  subject text not null,
  body_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 4,
  next_attempt_at timestamptz not null default now(),
  provider_message_id text not null default '',
  last_error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_deliveries_ready_idx on public.email_deliveries (status, next_attempt_at)
  where status in ('pending', 'failed');
create index email_deliveries_user_idx on public.email_deliveries (user_id, created_at desc);

alter table public.email_deliveries enable row level security;
-- No client policies: only the service role may inspect or deliver email.

create or replace function public.queue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  recipient_email text;
  recipient_locale public.locale_code;
  opted_in boolean;
begin
  select u.email, p.locale
    into recipient_email, recipient_locale
    from auth.users u
    join public.profiles p on p.id = u.id
   where u.id = new.user_id;

  if recipient_email is null or recipient_email = '' then
    return new;
  end if;

  select coalesce(np.email_opt_in, false)
    into opted_in
    from public.notification_preferences np
   where np.user_id = new.user_id;

  if coalesce(opted_in, false) is not true then
    return new;
  end if;

  insert into public.email_deliveries
    (user_id, notification_id, to_email, locale, subject, body_text)
  values
    (new.user_id, new.id, recipient_email, coalesce(recipient_locale, 'en'), new.title, new.body)
  on conflict (notification_id) do nothing;

  return new;
end;
$$;

create trigger notifications_queue_email
after insert on public.notifications
for each row execute function public.queue_notification_email();

create or replace function public.claim_emails(p_limit integer default 10)
returns setof public.email_deliveries
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select e.id
    from public.email_deliveries e
    where e.status in ('pending', 'failed')
      and e.attempts < e.max_attempts
      and e.next_attempt_at <= now()
    order by e.next_attempt_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.email_deliveries e
     set status = 'sending',
         attempts = e.attempts + 1
    from candidates c
   where e.id = c.id
  returning e.*;
$$;

create or replace function public.complete_email(p_id uuid, p_provider_message_id text default '')
returns void
language sql
security definer
set search_path = public
as $$
  update public.email_deliveries
     set status = 'sent',
         sent_at = now(),
         provider_message_id = left(coalesce(p_provider_message_id, ''), 255),
         last_error = ''
   where id = p_id;
$$;

create or replace function public.fail_email(p_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts integer;
  max_attempts integer;
  backoff_seconds integer;
begin
  select attempts, max_attempts
    into current_attempts, max_attempts
    from public.email_deliveries
   where id = p_id
   for update;

  if not found then
    return;
  end if;

  backoff_seconds := least(3600, (60 * power(2, greatest(0, current_attempts - 1)))::integer);

  update public.email_deliveries
     set status = case when current_attempts >= max_attempts then 'dead' else 'failed' end,
         last_error = left(coalesce(p_error, ''), 2000),
         next_attempt_at = now() + make_interval(secs => backoff_seconds)
   where id = p_id;
end;
$$;

revoke all on function public.queue_notification_email() from public;
revoke all on function public.claim_emails(integer) from public;
revoke all on function public.complete_email(uuid, text) from public;
revoke all on function public.fail_email(uuid, text) from public;

grant execute on function public.claim_emails(integer) to service_role;
grant execute on function public.complete_email(uuid, text) to service_role;
grant execute on function public.fail_email(uuid, text) to service_role;