-- Executar inteiro após 20260916120000_direct_user_management.sql.
-- Testa permissões/vínculos no banco; a criação Auth Admin e o login exigem teste de interface.
-- Somente fixtures temporárias, inclusive o novo master. Nenhuma conta real é alterada.
begin;
do $$
declare root uuid; home uuid; wa uuid; wb uuid; person uuid; label text;
begin
 if to_regprocedure('public.assign_managed_user(uuid,text,text,boolean)') is null then
  raise exception 'Aplique a migration direct_user_management antes deste teste';
 end if;
 select user_id into strict root from private.platform_admins limit 1;
 select id into strict home from public.workspaces where is_lume;
 perform set_config('test.root',root::text,true);
 perform set_config('test.home',home::text,true);
 perform set_config('request.jwt.claim.sub',root::text,true);
 wa:=(public.platform_manage('create_client',null,'{"name":"Teste cadastro direto A"}')->>'id')::uuid;
 wb:=(public.platform_manage('create_client',null,'{"name":"Teste cadastro direto B"}')->>'id')::uuid;
 perform set_config('test.wa',wa::text,true);
 perform set_config('test.wb',wb::text,true);
 foreach label in array array['admin_a','admin_b','member','spare','master','fresh_master','unconfirmed'] loop
  person:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at) values
   (person,'direct-'||person||'@example.invalid',case when label='unconfirmed' then null else now() end);
  insert into public.profiles(id,full_name) values(person,'Teste '||label) on conflict do nothing;
  perform set_config('test.'||label,person::text,true);
 end loop;
end $$;

set local role authenticated;
select public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.admin_a')||'@example.invalid','admin');
select public.assign_managed_user(current_setting('test.wb')::uuid,'direct-'||current_setting('test.admin_b')||'@example.invalid','admin');
select set_config('request.jwt.claim.sub',current_setting('test.admin_a'),true);
do $$ declare r jsonb; begin
 r:=public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.member')||'@example.invalid','member',true);
 if r->>'userId' is distinct from current_setting('test.member') or (r->>'assigned')::boolean then raise exception 'FAIL preflight'; end if;
 if exists(select 1 from public.workspace_members where user_id=current_setting('test.member')::uuid) then raise exception 'FAIL preflight wrote membership'; end if;
 r:=public.assign_managed_user(current_setting('test.wa')::uuid,'missing-'||gen_random_uuid()||'@example.invalid','member',true);
 if r->>'userId' is not null then raise exception 'FAIL missing account preflight'; end if;
 perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.member')||'@example.invalid','member');
 if not exists(select 1 from public.workspace_members where user_id=current_setting('test.member')::uuid and role='member' and active) then raise exception 'FAIL admin creates member'; end if;
 begin
  perform public.assign_managed_user(current_setting('test.wb')::uuid,'direct-'||current_setting('test.spare')||'@example.invalid','admin',true);
  raise exception 'FAIL cross-company preflight';
 exception when insufficient_privilege then null; end;
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.spare')||'@example.invalid','master');
  raise exception 'FAIL admin creates master';
 exception when insufficient_privilege then null; end;
 begin
  perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.spare')||'@example.invalid','master',true);
  raise exception 'FAIL admin preflights master';
 exception when insufficient_privilege then null; end;
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.unconfirmed')||'@example.invalid','member');
  raise exception 'FAIL unconfirmed linked';
 exception when check_violation then null; end;
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.admin_b')||'@example.invalid','member');
  raise exception 'FAIL account transferred';
 exception when check_violation then null; end;
 -- O formulário de Equipe usa esta RPC para alterar papel e permissões.
 perform public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'admin',true,'[]');
 if not exists(select 1 from public.workspace_members where user_id=current_setting('test.member')::uuid and role='admin') then raise exception 'FAIL role update'; end if;
 perform public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'member',false,
  '[{"module":"crm","read":false,"create":false,"update":false,"delete":false}]');
 r:=public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.member')||'@example.invalid','admin');
 if r->>'alreadyAssigned' is distinct from 'true' then raise exception 'FAIL retry result'; end if;
 if not exists(select 1 from public.workspace_members where user_id=current_setting('test.member')::uuid and role='member' and not active) then raise exception 'FAIL retry changed membership'; end if;
 if exists(select 1 from public.member_permissions where user_id=current_setting('test.member')::uuid and module='crm' and can_read) then raise exception 'FAIL retry changed permissions'; end if;
 perform public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'member',true,'[]');
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.spare')||'@example.invalid','member');
  raise exception 'FAIL member creates user';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ declare r jsonb; begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'direct-'||current_setting('test.master')||'@example.invalid','master');
  raise exception 'FAIL master assigned to customer';
 exception when insufficient_privilege then null; end;
 begin
  perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.admin_a')||'@example.invalid','master');
  raise exception 'FAIL customer transferred to Lume';
 exception when check_violation then null; end;
 -- Master gerencia outra empresa sem vínculo de membro nela.
 perform public.assign_managed_user(current_setting('test.wb')::uuid,'direct-'||current_setting('test.spare')||'@example.invalid','admin');
 -- Cadastro master para conta nova, ainda sem vínculo.
 perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.fresh_master')||'@example.invalid','master');
 if not exists(select 1 from public.workspace_members where user_id=current_setting('test.fresh_master')::uuid and workspace_id=current_setting('test.home')::uuid and active) then raise exception 'FAIL new master membership'; end if;
 -- Promove diretamente uma conta já vinculada à Lume.
 perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.master')||'@example.invalid','member');
 perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.master')||'@example.invalid','master');
 r:=public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.master')||'@example.invalid','master');
 if r->>'alreadyAssigned' is distinct from 'true' then raise exception 'FAIL duplicate master'; end if;
 begin
  perform public.assign_managed_user(current_setting('test.home')::uuid,'direct-'||current_setting('test.master')||'@example.invalid','member');
  raise exception 'FAIL master modified through company assignment';
 exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.admin_audit where event='master.granted' and details->>'user_id'=current_setting('test.master')) then raise exception 'FAIL missing master audit'; end if;
 if not exists(select 1 from public.admin_audit where event='user.assigned_directly' and details->>'user_id'=current_setting('test.member')) then raise exception 'FAIL missing user audit'; end if;
 -- Os três caminhos antigos devem falhar, inclusive platform_manage.
 begin
  perform public.create_workspace_invite(current_setting('test.wa')::uuid,'disabled@example.invalid','member',repeat('a',64));
  raise exception 'FAIL legacy invite creation';
 exception when insufficient_privilege then null; end;
 begin
  perform public.accept_workspace_invite(repeat('a',64));
  raise exception 'FAIL legacy invite acceptance';
 exception when insufficient_privilege then null; end;
 begin
  perform public.platform_manage('invite_master',current_setting('test.home')::uuid,jsonb_build_object('email','disabled@example.invalid','token',repeat('a',64)));
  raise exception 'FAIL legacy master invite';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.fresh_master'),true);
do $$ begin
 if not public.is_lume_master() then raise exception 'FAIL new account master access'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.master'),true);
do $$ begin
 if not public.is_lume_master() then raise exception 'FAIL direct master access'; end if;
 if not public.module_access(current_setting('test.wa')::uuid,'crm','read') or not public.module_access(current_setting('test.wb')::uuid,'financeiro','read') then raise exception 'FAIL master access across companies/modules'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.platform_manage('remove_master',current_setting('test.master')::uuid,'{}');
select set_config('request.jwt.claim.sub',current_setting('test.master'),true);
do $$ begin
 if public.is_lume_master() then raise exception 'FAIL revoked master'; end if;
 begin
  perform public.assign_managed_user(current_setting('test.home')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL revoked master still creates users';
 exception when insufficient_privilege then null; end;
end $$;

reset role;
update public.workspaces set status='suspended' where id=current_setting('test.wa')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.admin_a'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL suspended company admin';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL suspended company master provisioning';
 exception when check_violation then null; end;
end $$;
reset role;
update public.workspaces set status='active' where id=current_setting('test.wa')::uuid;
update public.workspace_members set active=false where user_id=current_setting('test.admin_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.admin_a'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL inactive admin';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL anonymous call';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: direct users, company isolation, roles, retries, master grant/revocation, legacy invitations disabled and anonymous denial' as result;
rollback;
