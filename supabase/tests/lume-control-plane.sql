begin;
-- Fixtures only; all are rolled back, including master grants and customer environments.
do $$ declare root uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); begin
 select user_id into strict root from private.platform_admins limit 1;
 insert into auth.users(id,email,email_confirmed_at) values(a,'audit-admin@example.invalid',now()),(b,'audit-member@example.invalid',now()),(c,'audit-master@example.invalid',now());
 insert into public.profiles(id,full_name) values(a,'Audit admin'),(b,'Audit member'),(c,'Audit master');
 perform set_config('test.root',root::text,true); perform set_config('test.a',a::text,true); perform set_config('test.b',b::text,true); perform set_config('test.c',c::text,true);
 perform set_config('test.t1',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
 perform set_config('test.t2',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
 perform set_config('test.t3',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
 perform set_config('test.tm',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ declare wa uuid; wb uuid; home uuid; begin
 if not public.is_lume_master() then raise exception 'FAIL bootstrap master'; end if;
 wa:=(public.platform_manage('create_client',null,'{"name":"Audit client A"}')->>'id')::uuid;
 wb:=(public.platform_manage('create_client',null,'{"name":"Audit client B"}')->>'id')::uuid;
 perform public.platform_manage('configure_client',wa,'{"name":"Audit client A","status":"active","version":1,"modules":{"crm":true}}');
 perform public.create_workspace_invite(wa,'audit-admin@example.invalid','admin',current_setting('test.t1'));
 perform public.create_workspace_invite(wb,'audit-admin@example.invalid','admin',current_setting('test.t2'));
 select id into home from public.workspaces where is_lume;
 perform public.platform_manage('invite_master',home,jsonb_build_object('email','audit-master@example.invalid','token',current_setting('test.tm')));
 perform set_config('test.wa',wa::text,true); perform set_config('test.wb',wb::text,true);
 begin
  perform public.platform_manage('configure_client',wa,'{"name":"Stale","status":"active","version":1,"modules":{}}');
  raise exception 'FAIL stale configuration';
 exception when serialization_failure then null; end;
 begin
  perform public.platform_manage('remove_master',current_setting('test.root')::uuid,'{}');
  raise exception 'FAIL last master';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$ declare customer uuid; begin
 perform public.accept_workspace_invite(current_setting('test.t1'));
 if public.is_lume_master() then raise exception 'FAIL tenant became master'; end if;
 if not public.module_access(current_setting('test.wa')::uuid,'crm','create') then raise exception 'FAIL enabled CRM'; end if;
 if public.module_access(current_setting('test.wa')::uuid,'financeiro','read') then raise exception 'FAIL disabled module'; end if;
 if exists(select 1 from public.workspaces where id=current_setting('test.wb')::uuid) then raise exception 'FAIL tenant isolation'; end if;
 begin perform public.create_workspace('Unauthorized'); raise exception 'FAIL self provision'; exception when insufficient_privilege then null; end;
 begin perform public.platform_manage('create_client',null,'{"name":"Unauthorized"}'); raise exception 'FAIL platform access'; exception when insufficient_privilege then null; end;
 begin perform public.accept_workspace_invite(current_setting('test.t2')); raise exception 'FAIL second workspace'; exception when check_violation then null; end;
 begin update public.workspace_modules set enabled=true where workspace_id=current_setting('test.wa')::uuid; raise exception 'FAIL tenant module grant'; exception when insufficient_privilege then null; end;
 insert into public.companies(workspace_id,name) values(current_setting('test.wa')::uuid,'Audit CRM customer') returning id into customer;
 perform set_config('test.customer',customer::text,true);
 perform public.create_workspace_invite(current_setting('test.wa')::uuid,'audit-member@example.invalid','member',current_setting('test.t3'));
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
select public.accept_workspace_invite(current_setting('test.t3'));
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.b')::uuid,'member',true,'[{"module":"crm","read":true,"create":false,"update":false,"delete":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ declare n integer; begin
 if not exists(select 1 from public.companies where id=current_setting('test.customer')::uuid) then raise exception 'FAIL permitted read'; end if;
 begin insert into public.companies(workspace_id,name) values(current_setting('test.wa')::uuid,'Unauthorized'); raise exception 'FAIL create permission'; exception when insufficient_privilege then null; end;
 update public.companies set name='Unauthorized' where id=current_setting('test.customer')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL update permission'; end if;
 delete from public.companies where id=current_setting('test.customer')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL delete permission'; end if;
 begin perform public.manage_member(current_setting('test.wa')::uuid,current_setting('test.a')::uuid,'member',false,'[]'); raise exception 'FAIL member administers'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.platform_manage('configure_client',current_setting('test.wa')::uuid,'{"name":"Audit client A","status":"suspended","version":2,"modules":{"crm":true}}');
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$ begin
 if public.module_access(current_setting('test.wa')::uuid,'crm','read') then raise exception 'FAIL suspension'; end if;
 if exists(select 1 from public.companies where id=current_setting('test.customer')::uuid) then raise exception 'FAIL suspended read'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
select public.accept_workspace_invite(current_setting('test.tm'));
do $$ begin
 if not public.is_lume_master() then raise exception 'FAIL second master'; end if;
 if not exists(select 1 from public.companies where id=current_setting('test.customer')::uuid) then raise exception 'FAIL master cross suspended'; end if;
 if not public.module_access(current_setting('test.wb')::uuid,'crm','read') then raise exception 'FAIL master module override'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.platform_manage('remove_master',current_setting('test.c')::uuid,'{}');
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$ begin
 if public.is_lume_master() then raise exception 'FAIL revoked master'; end if;
 if exists(select 1 from public.companies where id=current_setting('test.customer')::uuid) then raise exception 'FAIL revoked access'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.is_lume_master(); raise exception 'FAIL anon master check'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.admin_audit; raise exception 'FAIL anon audit'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: master bootstrap, second master invitation/revocation, last master guard, provisioning, one company per user, module entitlements, CRUD permissions, tenant isolation, suspension, stale edits and anonymous denial. Rollback all fixtures.' result;
rollback;

