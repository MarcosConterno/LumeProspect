-- Executar inteiro após 20260916150000_central_settings_managers.sql.
-- Dados temporários; nada é mantido ao final. Não testa login nem interface.
begin;
do $$ declare root uuid; wa uuid; wb uuid; person uuid; label text; begin
 select user_id into strict root from private.platform_admins limit 1;
 perform set_config('test.root',root::text,true);
 perform set_config('request.jwt.claim.sub',root::text,true);
 wa:=(public.platform_manage('create_client',null,'{"name":"Teste configurações A"}')->>'id')::uuid;
 wb:=(public.platform_manage('create_client',null,'{"name":"Teste configurações B"}')->>'id')::uuid;
 perform set_config('test.wa',wa::text,true);
 perform set_config('test.wb',wb::text,true);
 foreach label in array array['admin','manager','member','other_manager','other','new_user'] loop
  person:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at) values(person,'settings-'||person||'@example.invalid',now());
  insert into public.profiles(id,full_name) values(person,'Teste '||label) on conflict do nothing;
  perform set_config('test.'||label,person::text,true);
 end loop;
 update public.workspace_modules set enabled=true where workspace_id=wa and module='crm';
end $$;
set local role authenticated;
select public.assign_managed_user(current_setting('test.wa')::uuid,'settings-'||current_setting('test.admin')||'@example.invalid','admin');
select public.assign_managed_user(current_setting('test.wb')::uuid,'settings-'||current_setting('test.other')||'@example.invalid','member');
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.assign_managed_user(current_setting('test.wa')::uuid,'settings-'||current_setting('test.manager')||'@example.invalid','manager');
select public.assign_managed_user(current_setting('test.wa')::uuid,'settings-'||current_setting('test.other_manager')||'@example.invalid','manager');
select public.assign_managed_user(current_setting('test.wa')::uuid,'settings-'||current_setting('test.member')||'@example.invalid','member');
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.manager')::uuid,'manager',true,
 '[{"module":"crm","read":true,"create":false,"update":false,"delete":false}]');

select set_config('request.jwt.claim.sub',current_setting('test.manager'),true);
do $$ declare member_id uuid:=current_setting('test.member')::uuid; wa uuid:=current_setting('test.wa')::uuid; r text; begin
 if not exists(select 1 from public.workspace_members where user_id=auth.uid() and role='manager') then raise exception 'FAIL manager role'; end if;
 if exists(select 1 from public.workspaces where id=current_setting('test.wb')::uuid) then raise exception 'FAIL manager sees another company'; end if;
 if exists(select 1 from public.member_permissions where workspace_id=current_setting('test.wb')::uuid) then raise exception 'FAIL cross-company permissions'; end if;
 if not exists(select 1 from public.member_permissions where user_id=member_id and module='crm') then raise exception 'FAIL manager cannot read member permissions'; end if;
 if exists(select 1 from public.member_permissions where user_id=current_setting('test.admin')::uuid) then raise exception 'FAIL manager reads administrator permissions'; end if;
 if public.module_access(wa,'crm','create') then raise exception 'FAIL manager bypasses module rights'; end if;
 foreach r in array array['admin','manager','master'] loop
  begin
   perform public.assign_managed_user(wa,'settings-'||current_setting('test.new_user')||'@example.invalid',r,true);
   raise exception 'FAIL manager creates privileged role';
  exception when insufficient_privilege then null; end;
 end loop;
 begin
  perform public.assign_managed_user(current_setting('test.wb')::uuid,'settings-'||current_setting('test.new_user')||'@example.invalid','member',true);
  raise exception 'FAIL manager cross-company create';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manage_member(wa,current_setting('test.admin')::uuid,'member',false,'[]');
  raise exception 'FAIL manager edits administrator';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manage_member(wa,current_setting('test.other_manager')::uuid,'member',false,'[]');
  raise exception 'FAIL manager edits another manager';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manage_member(wa,auth.uid(),'admin',true,'[]');
  raise exception 'FAIL manager self promotion';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manage_member(wa,member_id,'manager',true,'[]');
  raise exception 'FAIL manager promotes member';
 exception when insufficient_privilege then null; end;
 begin
  perform public.manage_member(wa,member_id,'member',true,'[{"module":"crm","read":true,"create":true,"update":false,"delete":false}]');
  raise exception 'FAIL manager delegates unavailable permission';
 exception when insufficient_privilege then null; end;
 -- Omissão das permissões também não permite reativar direitos superiores.
 perform public.manage_member(wa,member_id,'member',false,'[]');
 begin
  perform public.manage_member(wa,member_id,'member',true,'[]');
  raise exception 'FAIL manager reactivates higher permissions';
 exception when insufficient_privilege then null; end;
 perform public.assign_managed_user(wa,'settings-'||current_setting('test.new_user')||'@example.invalid','member');
 if not exists(select 1 from public.member_permissions where user_id=current_setting('test.new_user')::uuid and module='crm' and can_read and not can_create and not can_update and not can_delete) then raise exception 'FAIL new user exceeds manager rights'; end if;
 if exists(select 1 from public.member_permissions where user_id=current_setting('test.new_user')::uuid and module='financeiro' and (can_read or can_settle or can_reverse)) then raise exception 'FAIL unlicensed rights delegated'; end if;
 perform public.manage_member(wa,member_id,'member',false,'[{"module":"crm","read":true,"create":false,"update":false,"delete":false}]');
 if not exists(select 1 from public.workspace_members where user_id=member_id and not active) then raise exception 'FAIL manager cannot disable member'; end if;
 perform public.manage_member(wa,member_id,'member',true,'[]');
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL member manages users';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.manager')::uuid,'manager',false,'[]');
select set_config('request.jwt.claim.sub',current_setting('test.manager'),true);
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL inactive manager';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ begin
 if not exists(select 1 from public.workspaces where id=current_setting('test.wa')::uuid) or not exists(select 1 from public.workspaces where id=current_setting('test.wb')::uuid) then raise exception 'FAIL master company selection'; end if;
 perform public.manage_member(current_setting('test.wa')::uuid,current_setting('test.manager')::uuid,'manager',true,'[]');
 perform public.manage_member(current_setting('test.wb')::uuid,current_setting('test.other')::uuid,'manager',true,'[]');
end $$;
set local role anon;
do $$ begin
 begin
  perform public.assign_managed_user(current_setting('test.wa')::uuid,'missing@example.invalid','member',true);
  raise exception 'FAIL anonymous provisioning';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: manager scope, role hierarchy, permission ceiling, company isolation and master administration' as result;
rollback;
