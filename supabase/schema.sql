-- Execute este arquivo uma vez no SQL Editor do projeto Supabase.

create table if not exists public.anfit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Ana',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anfit_user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.anfit_profiles enable row level security;
alter table public.anfit_user_app_data enable row level security;

drop policy if exists "Ana Fit users can read their own profile" on public.anfit_profiles;
create policy "Ana Fit users can read their own profile"
on public.anfit_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Ana Fit users can update their own profile" on public.anfit_profiles;
create policy "Ana Fit users can update their own profile"
on public.anfit_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Ana Fit users can read their own app data" on public.anfit_user_app_data;
create policy "Ana Fit users can read their own app data"
on public.anfit_user_app_data for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Ana Fit users can create their own app data" on public.anfit_user_app_data;
create policy "Ana Fit users can create their own app data"
on public.anfit_user_app_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Ana Fit users can update their own app data" on public.anfit_user_app_data;
create policy "Ana Fit users can update their own app data"
on public.anfit_user_app_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.anfit_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists anfit_profiles_set_updated_at on public.anfit_profiles;
create trigger anfit_profiles_set_updated_at
before update on public.anfit_profiles
for each row execute procedure public.anfit_set_updated_at();

drop trigger if exists anfit_user_app_data_set_updated_at on public.anfit_user_app_data;
create trigger anfit_user_app_data_set_updated_at
before update on public.anfit_user_app_data
for each row execute procedure public.anfit_set_updated_at();

create or replace function public.anfit_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.anfit_profiles (user_id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Ana')
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_anfit on auth.users;
create trigger on_auth_user_created_anfit
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.anfit_handle_new_user();

grant usage on schema public to authenticated;
grant select on public.anfit_profiles to authenticated;
grant update (display_name) on public.anfit_profiles to authenticated;
grant select, insert, update on public.anfit_user_app_data to authenticated;
