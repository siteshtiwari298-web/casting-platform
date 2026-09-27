-- =========================================================
-- Production Database & Casting Platform — Schema (v1)
-- Target: Supabase (Postgres + Auth + Storage)
-- =========================================================
-- Notes on design decisions baked into this schema:
--  1. Contact info (phone/email) for actors & locations is
--     NEVER exposed to normal users. Postgres RLS is row-level,
--     not column-level, so we split sensitive fields out into
--     the base table and expose a "public" VIEW that omits them.
--     Only the admin role and the owning profile can read the
--     base table directly.
--  2. Contact happens via a request queue (contact_requests).
--     Status on that queue is admin-only — clients never see it.
--  3. Everything starts life as 'pending' and only becomes
--     visible in the public views once status = 'approved'.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------
-- 1. Roles / Profiles
-- ---------------------------------------------------------
-- One row per Supabase auth.users entry, tagging their role.
create type user_role as enum ('actor', 'location_owner', 'production', 'admin');

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'production',
  full_name     text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. Shared enums
-- ---------------------------------------------------------
create type approval_status as enum ('pending', 'needs_changes', 'approved', 'rejected');
create type gender_type as enum ('male', 'female', 'non_binary', 'other');
create type location_category as enum (
  'house','apartment','villa','cafe','restaurant','bar','hotel','office',
  'school','college','hospital','street','warehouse','factory','rooftop',
  'garden','farm','studio','other'
);
create type media_kind as enum ('photo','video','showreel','intro_video');
create type request_target as enum ('actor','location');
create type request_status as enum ('new','contacted','closed');

-- ---------------------------------------------------------
-- 3. Sequences for human-friendly IDs (ACT-00001, LOC-00001)
-- ---------------------------------------------------------
create sequence actor_code_seq start 1;
create sequence location_code_seq start 1;

create or replace function next_actor_code() returns text as $$
  select 'ACT-' || lpad(nextval('actor_code_seq')::text, 5, '0');
$$ language sql;

create or replace function next_location_code() returns text as $$
  select 'LOC-' || lpad(nextval('location_code_seq')::text, 5, '0');
$$ language sql;

-- ---------------------------------------------------------
-- 4. Actors
-- ---------------------------------------------------------
create table actors (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  actor_code          text unique not null default next_actor_code(),

  -- Basic info
  full_name           text not null,
  date_of_birth       date,
  gender              gender_type,
  height_cm           numeric,
  weight_kg           numeric,
  current_location    text,
  hometown            text,
  is_minor            boolean not null default false, -- true if under 18 at submission

  -- Professional
  acting_experience   text,
  previous_projects   text[],
  training             text,
  education            text,
  languages            text[],   -- e.g. {'Nepali','Hindi','English'}
  special_skills       text[],   -- e.g. {'Dancing','Martial arts'}

  -- Contact (SENSITIVE — never selected through the public view)
  phone               text,
  email               text,

  -- Guardian info, required when is_minor = true
  guardian_name       text,
  guardian_phone      text,
  guardian_email      text,

  status              approval_status not null default 'pending',
  admin_notes         text,       -- private, admin-only feedback/notes

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table actor_media (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references actors(id) on delete cascade,
  kind          media_kind not null,
  storage_path  text not null,   -- path in Supabase Storage bucket
  is_primary    boolean not null default false, -- main profile photo
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 5. Locations
-- ---------------------------------------------------------
create table locations (
  id                    uuid primary key default gen_random_uuid(),
  owner_profile_id      uuid not null references profiles(id) on delete cascade,
  location_code         text unique not null default next_location_code(),

  name                  text not null,
  category              location_category not null,
  area                  text,               -- e.g. "Sukedhara, Kathmandu"
  rental_price_per_day  numeric,
  facilities            text[],             -- e.g. {'Parking','Garden','Rooftop'}
  indoor_shooting       boolean default false,
  outdoor_shooting      boolean default false,
  available_hours       text,
  restrictions          text,
  permission_required   boolean default false,
  noise_restrictions    text,
  generator_available   boolean default false,
  parking_capacity      int,
  previous_productions  text,
  production_notes      text,       -- private, admin-only

  -- Contact (SENSITIVE)
  owner_phone           text,
  owner_email           text,

  status                approval_status not null default 'pending',
  admin_notes           text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table location_media (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references locations(id) on delete cascade,
  kind          media_kind not null,      -- photo or video
  category      text,                     -- exterior/interior/room/rooftop/garden
  storage_path  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. Tags (many-to-many, shared vocabulary per type)
-- ---------------------------------------------------------
create type tag_type as enum ('actor','location');

create table tags (
  id    uuid primary key default gen_random_uuid(),
  type  tag_type not null,
  name  text not null,
  unique (type, name)
);

create table actor_tags (
  actor_id uuid not null references actors(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (actor_id, tag_id)
);

create table location_tags (
  location_id uuid not null references locations(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (location_id, tag_id)
);

-- ---------------------------------------------------------
-- 7. Contact requests (the admin-mediated introduction flow)
-- ---------------------------------------------------------
create table contact_requests (
  id                  uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references profiles(id) on delete cascade,
  target_type         request_target not null,
  target_id           uuid not null,   -- actor.id or location.id, checked in app layer
  status              request_status not null default 'new', -- admin-only visibility
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 8. Public-facing VIEWS (no contact fields, approved-only)
-- ---------------------------------------------------------
create view actors_public as
  select
    id, actor_code, full_name, date_of_birth, gender, height_cm, weight_kg,
    current_location, hometown, acting_experience, previous_projects,
    training, education, languages, special_skills, status, created_at
  from actors
  where status = 'approved';

create view locations_public as
  select
    id, location_code, name, category, area, rental_price_per_day,
    facilities, indoor_shooting, outdoor_shooting, available_hours,
    generator_available, parking_capacity, status, created_at
  from locations
  where status = 'approved';

-- ---------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------
alter table profiles enable row level security;
alter table actors enable row level security;
alter table actor_media enable row level security;
alter table locations enable row level security;
alter table location_media enable row level security;
alter table contact_requests enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable;

-- profiles: users see their own row; admin sees all
create policy profiles_self_or_admin on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- actors (base table, includes phone/email): owner + admin only
create policy actors_owner_or_admin_select on actors
  for select using (profile_id = auth.uid() or is_admin());
create policy actors_owner_insert on actors
  for insert with check (profile_id = auth.uid());
create policy actors_owner_or_admin_update on actors
  for update using (profile_id = auth.uid() or is_admin());
-- Note: actors_public VIEW is granted to authenticated role separately
-- (views run with the privileges of their owner unless security_invoker
-- is set — grant select on the view, not the base table, to app roles).

-- locations: same pattern
create policy locations_owner_or_admin_select on locations
  for select using (owner_profile_id = auth.uid() or is_admin());
create policy locations_owner_insert on locations
  for insert with check (owner_profile_id = auth.uid());
create policy locations_owner_or_admin_update on locations
  for update using (owner_profile_id = auth.uid() or is_admin());

-- media: readable if parent record is approved (via public view logic)
-- or if you own it or are admin
create policy actor_media_visibility on actor_media
  for select using (
    is_admin()
    or exists (select 1 from actors a where a.id = actor_id and a.profile_id = auth.uid())
    or exists (select 1 from actors a where a.id = actor_id and a.status = 'approved')
  );

create policy location_media_visibility on location_media
  for select using (
    is_admin()
    or exists (select 1 from locations l where l.id = location_id and l.owner_profile_id = auth.uid())
    or exists (select 1 from locations l where l.id = location_id and l.status = 'approved')
  );

-- contact_requests: requester can insert + see their own request exists,
-- but NOT its status; only admin gets full read/update.
-- (Simplest v1 approach: no select policy for non-admins at all —
-- the client gets a one-time success message from the API call itself,
-- not by reading this table back.)
create policy contact_requests_admin_select on contact_requests
  for select using (is_admin());
create policy contact_requests_insert on contact_requests
  for insert with check (requester_profile_id = auth.uid());
create policy contact_requests_admin_update on contact_requests
  for update using (is_admin());

-- ---------------------------------------------------------
-- 10. Grants for the public views (no sensitive columns)
-- ---------------------------------------------------------
grant select on actors_public to authenticated, anon;
grant select on locations_public to authenticated, anon;
