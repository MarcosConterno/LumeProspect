-- Run whole file. All temporary identities and data roll back; no email is sent.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a||'@example.invalid',now()),(b,b||'@example.invalid',now()),(c,c||'@example.invalid',now());
 perform set_config('test.a',a::text,true); perform set_config('test.b',b::text,true); perform set_config('test.c',c::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select set_config('test.wa',public.create_workspace('Auth test A')::text,true);
do $$ begin
 if not exists(select 1 from public.workspace_members where workspace_id=current_setting('test.wa')::uuid and user_id=auth.uid() and role='owner') then raise exception 'FAIL owner membership'; end if;
 perform public.create_workspace_invite(current_setting('test.wa')::uuid,current_setting('test.b')||'@example.invalid','admin',repeat('a',64));
 perform public.create_workspace_invite(current_setting('test.wa')::uuid,current_setting('test.c')||'@example.invalid','member',repeat('b',64));
 perform public.create_workspace_invite(current_setting('test.wa')::uuid,current_setting('test.c')||'@example.invalid','member',repeat('c',64));
 perform public.revoke_workspace_invite((select id from public.workspace_invites where email=current_setting('test.c')||'@example.invalid' order by id limit 1));
 -- Raw invitation secrets must not be readable by authenticated users.
 begin perform token_hash from public.workspace_invites; raise exception 'FAIL token exposed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$ begin
 if exists(select 1 from public.workspaces) then raise exception 'FAIL company visibility'; end if;
 begin perform public.accept_workspace_invite(repeat('a',64)); raise exception 'FAIL wrong email'; exception when insufficient_privilege then null; end;
 begin perform public.create_workspace_invite(current_setting('test.wa')::uuid,'intruder@example.invalid','admin',repeat('d',64)); raise exception 'FAIL cross invite'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
select public.accept_workspace_invite(repeat('a',64));
do $$ begin
 if (select role from public.workspace_members where user_id=auth.uid() and workspace_id=current_setting('test.wa')::uuid)<>'admin' then raise exception 'FAIL acceptance'; end if;
 if (select count(*) from public.profiles)<>2 then raise exception 'FAIL team profiles'; end if;
 begin perform public.accept_workspace_invite(repeat('a',64)); raise exception 'FAIL replay'; exception when insufficient_privilege then null; end;
 begin perform public.create_workspace_invite(current_setting('test.wa')::uuid,current_setting('test.c')||'@example.invalid','admin',repeat('d',64)); raise exception 'FAIL admin promotion'; exception when insufficient_privilege then null; end;
 perform public.create_workspace_invite(current_setting('test.wa')::uuid,current_setting('test.c')||'@example.invalid','member',repeat('e',64));
end $$;
select set_config('test.wb',public.create_workspace('Auth test B')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$ begin
 if exists(select 1 from public.workspaces where id=current_setting('test.wb')::uuid) then raise exception 'FAIL multi company isolation'; end if;
 update public.workspace_members set role='member' where workspace_id=current_setting('test.wa')::uuid and user_id=current_setting('test.b')::uuid;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$ begin
 begin perform public.accept_workspace_invite(repeat('e',64)); raise exception 'FAIL demoted creator'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.workspace_invites set revoked_at=now() where token_hash=encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex');
update public.workspace_invites set revoked_at=null,expires_at=now()-interval '1 second' where token_hash=encode(sha256(convert_to(repeat('c',64),'UTF8')),'hex');
set local role authenticated;
do $$ begin
 begin perform public.accept_workspace_invite(repeat('b',64)); raise exception 'FAIL revoked'; exception when insufficient_privilege then null; end;
 begin perform public.accept_workspace_invite(repeat('c',64)); raise exception 'FAIL expired'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ declare affected integer; begin
 update public.workspace_members set role='admin' where workspace_id=current_setting('test.wa')::uuid and user_id=auth.uid();
 get diagnostics affected=row_count; if affected<>0 then raise exception 'FAIL self promotion'; end if;
end $$;
reset role;
update public.workspaces set status='suspended' where id=current_setting('test.wa')::uuid;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.workspaces where id=current_setting('test.wa')::uuid) then raise exception 'FAIL suspended company'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.create_workspace('Unauthorized'); raise exception 'FAIL anonymous create'; exception when insufficient_privilege then null; end;
 begin perform public.accept_workspace_invite(repeat('a',64)); raise exception 'FAIL anonymous acceptance'; exception when insufficient_privilege then null; end;
end $$;
rollback;
