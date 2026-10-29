-- Home Project Planner — OPTIONAL, DEDICATED Supabase backend.
-- Run only against a new project specifically chosen for this app.
-- NEVER apply in an unrelated project's schema.
-- Client contains only the project's publishable key. Never deploy service_role.
create table if not exists public.hpp_households (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 100),
 created_at timestamptz not null default now()
);
create table if not exists public.hpp_members (
 household_id uuid not null references public.hpp_households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','member')),
 joined_at timestamptz not null default now(),
 primary key(household_id,user_id)
);
create table if not exists public.hpp_snapshots (
 household_id uuid primary key references public.hpp_households(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 document jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
create table if not exists public.hpp_invites (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.hpp_households(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default(now()+ interval '7 days'),
 used_at timestamptz
);
create index if not exists hpp_members_by_user on public.hpp_members(user_id);
create index if not exists hpp_invites_by_household on public.hpp_invites(household_id);
alter table public.hpp_households enable row level security;
alter table public.hpp_members enable row level security;
alter table public.hpp_snapshots enable row level security;
alter table public.hpp_invites enable row level security;
-- Member table only exposes the signed-in person's own memberships. This avoids recursive RLS.
create policy "members read own" on public.hpp_members for select to authenticated using (user_id=(select auth.uid()));
create policy "households read own memberships" on public.hpp_households for select to authenticated using (
 exists(select 1 from public.hpp_members m where m.household_id=id and m.user_id=(select auth.uid()))
);
create policy "snapshots read own memberships" on public.hpp_snapshots for select to authenticated using (
 exists(select 1 from public.hpp_members m where m.household_id=public.hpp_snapshots.household_id and m.user_id=(select auth.uid()))
);
create policy "snapshots update own memberships" on public.hpp_snapshots for update to authenticated
 using (exists(select 1 from public.hpp_members m where m.household_id=public.hpp_snapshots.household_id and m.user_id=(select auth.uid())))
 with check (exists(select 1 from public.hpp_members m where m.household_id=public.hpp_snapshots.household_id and m.user_id=(select auth.uid())));
-- Invites are not exposed to client SELECT, INSERT, UPDATE or DELETE at all.
revoke all on public.hpp_households,public.hpp_members,public.hpp_snapshots,public.hpp_invites from anon,authenticated;
grant select on public.hpp_households,public.hpp_members to authenticated;
grant select,update on public.hpp_snapshots to authenticated;

create or replace function public.hpp_create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid; v_home uuid;
begin
 v_user := (select auth.uid());
 if v_user is null then raise exception 'Sign in first'; end if;
 if length(trim(coalesce(p_name,'')))<1 or length(p_name)>100 then raise exception 'Invalid household name'; end if;
 insert into public.hpp_households(owner_id,name) values(v_user,trim(p_name)) returning id into v_home;
 insert into public.hpp_members(household_id,user_id,role) values(v_home,v_user,'owner');
 insert into public.hpp_snapshots(household_id,revision,document,updated_by) values(v_home,0,null,v_user);
 return v_home;
end;
$$;
create or replace function public.hpp_make_invite(p_household uuid,p_hash text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
 if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invite token'; end if;
 if not exists(select 1 from public.hpp_members m where m.household_id=p_household and m.user_id=(select auth.uid()) and m.role='owner')
 then raise exception 'Only the household owner can invite';end if;
 insert into public.hpp_invites(household_id,token_hash,created_by) values(p_household,p_hash,(select auth.uid()));
end;
$$;
create or replace function public.hpp_join_household(p_hash text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid;v_household uuid;v_invite uuid;
begin
 v_user := (select auth.uid());
 if v_user is null then raise exception 'Sign in first'; end if;
 select id,household_id into v_invite,v_household from public.hpp_invites
 where token_hash=p_hash and used_at is null and expires_at>now() for update;
 if v_invite is null then raise exception 'Invite expired or already used'; end if;
 if not exists(select 1 from public.hpp_members where household_id=v_household and user_id=v_user)
 then insert into public.hpp_members(household_id,user_id,role) values(v_household,v_user,'member'); end if;
 update public.hpp_invites set used_at=now() where id=v_invite;
 return v_household;
end;
$$;
-- Optimistic CAS, operating under the caller's own RLS (no privilege escalation).
create or replace function public.hpp_cas_snapshot(p_household uuid,p_revision bigint,p_document jsonb)
returns bigint language plpgsql security invoker set search_path = ''
as $$
declare v_revision bigint;
begin
 if (select auth.uid()) is null then raise exception 'Sign in first';end if;
 if p_document is null or octet_length(p_document::text)>20000000 then raise exception 'Invalid or oversized snapshot';end if;
 update public.hpp_snapshots
 set document=p_document,revision=revision+1,updated_at=now(),updated_by=(select auth.uid())
 where household_id=p_household and revision=p_revision
 returning revision into v_revision;
 return v_revision; -- NULL means stale revision / access denied. Never overwrite on a conflict.
end;
$$;
revoke all on function public.hpp_create_household(text) from public,anon;
revoke all on function public.hpp_make_invite(uuid,text) from public,anon;
revoke all on function public.hpp_join_household(text) from public,anon;
revoke all on function public.hpp_cas_snapshot(uuid,bigint,jsonb) from public,anon;
grant execute on function public.hpp_create_household(text) to authenticated;
grant execute on function public.hpp_make_invite(uuid,text) to authenticated;
grant execute on function public.hpp_join_household(text) to authenticated;
grant execute on function public.hpp_cas_snapshot(uuid,bigint,jsonb) to authenticated;
-- Do NOT grant access to invites directly. Test with two separate authenticated users before production.
