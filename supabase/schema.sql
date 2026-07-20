-- Execute este arquivo uma vez no SQL Editor do projeto Supabase.

create table if not exists public.anfit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Atleta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anfit_profiles alter column display_name set default 'Atleta';

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

-- Assigned nutrition is server-managed. Once a row has a plan, an authenticated
-- client may keep syncing the rest of its AppData blob, but cannot replace the
-- plan with an older local cache. SQL Editor and service-role maintenance remain
-- able to assign or revise a plan.
create or replace function public.anfit_preserve_assigned_nutrition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous_profile jsonb;
  incoming_profile jsonb;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or not (old.data ? 'assignedNutritionPlan') then
    return new;
  end if;

  if pg_catalog.jsonb_typeof(new.data) <> 'object' then
    raise exception 'AppData must remain a JSON object while an assigned nutrition plan is active.'
      using errcode = '22023';
  end if;

  if old.data ? 'assignedNutritionPlan' then
    new.data := pg_catalog.jsonb_set(
      new.data,
      '{assignedNutritionPlan}',
      old.data -> 'assignedNutritionPlan',
      true
    );
  end if;

  if old.data ? 'goals' then
    new.data := pg_catalog.jsonb_set(new.data, '{goals}', old.data -> 'goals', true);
  else
    new.data := new.data - 'goals';
  end if;

  if old.data ? 'meals' then
    new.data := pg_catalog.jsonb_set(new.data, '{meals}', old.data -> 'meals', true);
  else
    new.data := new.data - 'meals';
  end if;

  -- Portion adjustments are user-owned, but an older cached client will not
  -- send this field at all. Preserve an existing adjustment in that case while
  -- still allowing current clients to update it (including resetting it to {}).
  if old.data ? 'mealPortionOverrides' and not (new.data ? 'mealPortionOverrides') then
    new.data := pg_catalog.jsonb_set(
      new.data,
      '{mealPortionOverrides}',
      old.data -> 'mealPortionOverrides',
      true
    );
  end if;

  previous_profile := case
    when pg_catalog.jsonb_typeof(old.data -> 'profile') = 'object' then old.data -> 'profile'
    else '{}'::jsonb
  end;
  incoming_profile := case
    when pg_catalog.jsonb_typeof(new.data -> 'profile') = 'object' then new.data -> 'profile'
    else '{}'::jsonb
  end;

  if previous_profile ? 'preferredFoods' then
    incoming_profile := pg_catalog.jsonb_set(
      incoming_profile,
      '{preferredFoods}',
      previous_profile -> 'preferredFoods',
      true
    );
  else
    incoming_profile := incoming_profile - 'preferredFoods';
  end if;

  if previous_profile ? 'avoidedFoods' then
    incoming_profile := pg_catalog.jsonb_set(
      incoming_profile,
      '{avoidedFoods}',
      previous_profile -> 'avoidedFoods',
      true
    );
  else
    incoming_profile := incoming_profile - 'avoidedFoods';
  end if;

  new.data := pg_catalog.jsonb_set(new.data, '{profile}', incoming_profile, true);
  return new;
end;
$$;

drop trigger if exists anfit_user_app_data_preserve_assigned_nutrition on public.anfit_user_app_data;
create trigger anfit_user_app_data_preserve_assigned_nutrition
before update on public.anfit_user_app_data
for each row execute procedure public.anfit_preserve_assigned_nutrition();

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
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(initcap(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[._+-]+', ' ', 'g')), ''),
      'Atleta'
    )
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
