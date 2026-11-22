-- ================= enums =================
create type public.app_role as enum ('admin','manager','kitchen','attendance','student','viewer');
create type public.institution_type as enum ('hostel','college','school','corporate','hospital','canteen','ngo','other');
create type public.plan_tier as enum ('starter','pro','institution');
create type public.member_status as enum ('active','invited','suspended');
create type public.invite_status as enum ('pending','accepted','revoked','expired');

-- ================= updated_at helper =================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================= profiles =================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en','hi')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ================= institutions =================
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  short_code text not null unique,
  type public.institution_type not null default 'hostel',
  plan public.plan_tier not null default 'starter',
  address text,
  city text,
  state text,
  pincode text,
  gstin text,
  contact_email text,
  contact_phone text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  logo_url text,
  owner_id uuid references auth.users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index institutions_owner_idx on public.institutions (owner_id);
grant select, insert, update, delete on public.institutions to authenticated;
grant all on public.institutions to service_role;
alter table public.institutions enable row level security;

-- ================= institution_members (role table) =================
create table public.institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);
create index members_user_idx on public.institution_members (user_id);
create index members_institution_idx on public.institution_members (institution_id);
grant select, insert, update, delete on public.institution_members to authenticated;
grant all on public.institution_members to service_role;
alter table public.institution_members enable row level security;

-- ================= institution_settings =================
create table public.institution_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  language text not null default 'en' check (language in ('en','hi')),
  meals_per_day integer not null default 3 check (meals_per_day between 1 and 5),
  breakfast_time time not null default '07:30',
  lunch_time time not null default '13:00',
  dinner_time time not null default '20:00',
  default_plates integer not null default 100 check (default_plates > 0),
  waste_target_pct numeric(5,2) not null default 5.00 check (waste_target_pct between 0 and 100),
  low_stock_threshold_pct numeric(5,2) not null default 20.00 check (low_stock_threshold_pct between 0 and 100),
  gst_enabled boolean not null default true,
  tax_percent numeric(5,2) not null default 5.00 check (tax_percent between 0 and 40),
  attendance_qr_ttl_minutes integer not null default 120 check (attendance_qr_ttl_minutes between 5 and 1440),
  allow_offline_attendance boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.institution_settings to authenticated;
grant all on public.institution_settings to service_role;
alter table public.institution_settings enable row level security;

-- ================= invites =================
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  code text not null default substr(translate(md5(random()::text || clock_timestamp()::text),'abcdefghijklmnopqrstuvwxyz','0123456789'),1,8),
  status public.invite_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique (institution_id, email)
);
create index invites_email_idx on public.invites (lower(email));
grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
alter table public.invites enable row level security;

-- ================= audit_logs =================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_institution_idx on public.audit_logs (institution_id, created_at desc);
grant insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- ================= membership helper functions =================
create or replace function public.my_email()
returns text language sql stable security definer set search_path = public as $$
  select email from auth.users where id = auth.uid();
$$;

create or replace function public.is_member(_institution_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_members
    where institution_id = _institution_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.member_role(_institution_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.institution_members
  where institution_id = _institution_id and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.is_admin(_institution_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_members
    where institution_id = _institution_id and user_id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.has_role_at(_institution_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_members
    where institution_id = _institution_id and user_id = auth.uid() and role = _role and status = 'active'
  );
$$;

create or replace function public.is_owner(_institution_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institutions where id = _institution_id and owner_id = auth.uid()
  );
$$;

create or replace function public.my_institution_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select institution_id from public.institution_members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.shares_institution(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.institution_members a
    join public.institution_members b on a.institution_id = b.institution_id
    where a.user_id = auth.uid() and b.user_id = _user_id
      and a.status = 'active' and b.status = 'active'
  );
$$;

-- ================= onboarding functions =================
create or replace function public.new_short_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.institutions where short_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_institution(
  _name text,
  _type public.institution_type default 'hostel',
  _city text default null,
  _state text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if _name is null or length(trim(_name)) < 2 then
    raise exception 'Institution name is required';
  end if;

  insert into public.institutions (name, short_code, type, city, state, owner_id)
  values (trim(_name), public.new_short_code(), coalesce(_type, 'hostel'), nullif(trim(coalesce(_city,'')), ''), nullif(trim(coalesce(_state,'')), ''), v_uid)
  returning id into v_id;

  insert into public.institution_members (institution_id, user_id, role, status)
  values (v_id, v_uid, 'admin', 'active');

  insert into public.institution_settings (institution_id) values (v_id);

  return v_id;
end;
$$;

create or replace function public.join_institution(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inst uuid;
  v_role public.app_role := 'student';
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select id into v_inst from public.institutions
  where short_code = upper(trim(coalesce(_code, '')));

  if v_inst is null then
    raise exception 'No institution found with that code';
  end if;

  if exists (
    select role from public.invites
    where institution_id = v_inst
      and lower(email) = lower(public.my_email())
      and status = 'pending'
      and expires_at > now()
    limit 1
  ) then
    select role into v_role from public.invites
    where institution_id = v_inst
      and lower(email) = lower(public.my_email())
      and status = 'pending' and expires_at > now()
    limit 1;
  end if;

  insert into public.institution_members (institution_id, user_id, role, status)
  values (v_inst, v_uid, v_role, 'active')
  on conflict (institution_id, user_id) do nothing;

  update public.invites set status = 'accepted'
  where institution_id = v_inst
    and lower(email) = lower(public.my_email())
    and status = 'pending';

  return v_inst;
end;
$$;

-- ================= RLS policies =================
create policy "profiles: read own or colleague" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_institution(id));
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "institutions: members read" on public.institutions
  for select to authenticated
  using (public.is_member(id));
create policy "institutions: owner creates" on public.institutions
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy "institutions: admins update" on public.institutions
  for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));
create policy "institutions: owner deletes" on public.institutions
  for delete to authenticated
  using (public.is_owner(id));

create policy "members: institution reads roster" on public.institution_members
  for select to authenticated
  using (public.is_member(institution_id));
create policy "members: admin or owner adds" on public.institution_members
  for insert to authenticated
  with check (public.is_admin(institution_id) or public.is_owner(institution_id));
create policy "members: admin or owner updates" on public.institution_members
  for update to authenticated
  using (public.is_admin(institution_id) or public.is_owner(institution_id))
  with check (public.is_admin(institution_id) or public.is_owner(institution_id));
create policy "members: admin or owner removes" on public.institution_members
  for delete to authenticated
  using (public.is_admin(institution_id) or public.is_owner(institution_id));

create policy "settings: members read" on public.institution_settings
  for select to authenticated
  using (public.is_member(institution_id));
create policy "settings: admins manage" on public.institution_settings
  for insert to authenticated
  with check (public.is_admin(institution_id) or public.is_owner(institution_id));
create policy "settings: admins update" on public.institution_settings
  for update to authenticated
  using (public.is_admin(institution_id)) with check (public.is_admin(institution_id));

create policy "invites: admins read" on public.invites
  for select to authenticated
  using (public.is_admin(institution_id));
create policy "invites: admins add" on public.invites
  for insert to authenticated
  with check (public.is_admin(institution_id));
create policy "invites: admins update" on public.invites
  for update to authenticated
  using (public.is_admin(institution_id)) with check (public.is_admin(institution_id));
create policy "invites: admins remove" on public.invites
  for delete to authenticated
  using (public.is_admin(institution_id));

create policy "audit: members write own" on public.audit_logs
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(institution_id));
create policy "audit: admins read" on public.audit_logs
  for select to authenticated
  using (public.is_admin(institution_id));

-- ================= profile bootstrap on signup =================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), ''),
    split_part(coalesce(new.email,''), '@', 1)
  );
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(v_name, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();