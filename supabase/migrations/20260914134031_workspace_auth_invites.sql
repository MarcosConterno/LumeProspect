-- Authentication is personal; workspace membership authorizes company access.
-- Private privileged implementations, public invoker wrappers with explicit grants.
create function private.create_workspace(company_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; actor uuid := auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then
  raise exception 'Confirmed account required' using errcode='42501'; end if;
 if length(trim(company_name)) not between 2 and 160 then raise exception 'Invalid company name' using errcode='23514'; end if;
 insert into public.profiles(id,full_name)
 select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=actor
 on conflict(id) do nothing;
 insert into public.workspaces(name,owner_id) values(trim(company_name),actor) returning id into result;
 return result;
end $$;
create function public.create_workspace(company_name text) returns uuid
language sql security invoker set search_path='' as $$ select private.create_workspace(company_name) $$;
revoke all on function private.create_workspace(text), public.create_workspace(text) from public,anon;
grant execute on function private.create_workspace(text), public.create_workspace(text) to authenticated;

create table public.workspace_invites (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 254),
 role text not null check(role in ('admin','member')),
 token_hash text not null unique,
 created_by uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,
 revoked_at timestamptz
);
create index workspace_invites_workspace_created_idx on public.workspace_invites(workspace_id,created_at desc);
create index workspace_invites_creator_idx on public.workspace_invites(created_by);
alter table public.workspace_invites enable row level security;
revoke all on public.workspace_invites from public,anon,authenticated;
grant select(id,workspace_id,email,role,created_by,created_at,expires_at,accepted_at,revoked_at) on public.workspace_invites to authenticated;
create policy invites_read on public.workspace_invites for select to authenticated
 using(private.workspace_role(workspace_id) in ('owner','admin'));

create function private.create_workspace_invite(target uuid, invite_email text, invite_role text, token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor_role text := private.workspace_role(target); result uuid;
begin
 if auth.uid() is null or actor_role is null or not (actor_role='owner' or (actor_role='admin' and invite_role='member')) then
  raise exception 'Not authorized' using errcode='42501'; end if;
 if invite_role not in ('admin','member') or token !~ '^[a-f0-9]{64}$' or invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception 'Invalid invitation' using errcode='23514'; end if;
 insert into public.workspace_invites(workspace_id,email,role,token_hash,created_by)
 values(target,lower(trim(invite_email)),invite_role,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid()) returning id into result;
 return result;
end $$;
create function public.create_workspace_invite(target uuid, invite_email text, invite_role text, token text) returns uuid
language sql security invoker set search_path='' as $$ select private.create_workspace_invite(target,invite_email,invite_role,token) $$;
revoke all on function private.create_workspace_invite(uuid,text,text,text), public.create_workspace_invite(uuid,text,text,text) from public,anon;
grant execute on function private.create_workspace_invite(uuid,text,text,text), public.create_workspace_invite(uuid,text,text,text) to authenticated;

create function private.accept_workspace_invite(token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation public.workspace_invites; actor uuid := auth.uid(); verified_email text; creator_role text;
begin
 if actor is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation' using errcode='42501'; end if;
 select lower(email) into verified_email from auth.users where id=actor and email_confirmed_at is not null;
 select * into invitation from public.workspace_invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if not found or verified_email is null or invitation.email<>verified_email or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now() then
  raise exception 'Invalid or expired invitation' using errcode='42501'; end if;
 -- An invitation loses authority if its creator is removed/demoted or company suspended.
 select m.role into creator_role from public.workspace_members m join public.workspaces w on w.id=m.workspace_id
 where m.workspace_id=invitation.workspace_id and m.user_id=invitation.created_by and w.status='active' for share of m,w;
 if creator_role is null or not (creator_role='owner' or (creator_role='admin' and invitation.role='member')) then
  raise exception 'Invitation no longer authorized' using errcode='42501'; end if;
 insert into public.profiles(id,full_name) select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=actor on conflict(id) do nothing;
 -- Existing membership is never upgraded through an old invitation.
 insert into public.workspace_members(workspace_id,user_id,role) values(invitation.workspace_id,actor,invitation.role) on conflict(workspace_id,user_id) do nothing;
 update public.workspace_invites set accepted_at=now() where id=invitation.id;
 return invitation.workspace_id;
end $$;
create function public.accept_workspace_invite(token text) returns uuid
language sql security invoker set search_path='' as $$ select private.accept_workspace_invite(token) $$;
revoke all on function private.accept_workspace_invite(text), public.accept_workspace_invite(text) from public,anon;
grant execute on function private.accept_workspace_invite(text), public.accept_workspace_invite(text) to authenticated;

create function private.revoke_workspace_invite(invite_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare invitation public.workspace_invites; actor_role text;
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into invitation from public.workspace_invites where id=invite_id for update;
 actor_role := private.workspace_role(invitation.workspace_id);
 if actor_role is null or not (actor_role='owner' or (actor_role='admin' and invitation.role='member')) then
  raise exception 'Not authorized' using errcode='42501'; end if;
 update public.workspace_invites set revoked_at=now() where id=invite_id and accepted_at is null;
end $$;
create function public.revoke_workspace_invite(invite_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.revoke_workspace_invite(invite_id) $$;
revoke all on function private.revoke_workspace_invite(uuid), public.revoke_workspace_invite(uuid) from public,anon;
grant execute on function private.revoke_workspace_invite(uuid), public.revoke_workspace_invite(uuid) to authenticated;

create policy profiles_team_read on public.profiles for select to authenticated using (
 exists(select 1 from public.workspace_members m where m.user_id=profiles.id and private.workspace_role(m.workspace_id) is not null)
);
