begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); wa uuid:=gen_random_uuid(); wb uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(a),(b),(m);
 insert into public.profiles(id) values(a),(b),(m);
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.workspaces(id,name,owner_id) values(wa,'Temporary administration A',a);
 insert into public.workspace_members(workspace_id,user_id,role) values(wa,m,'member');
 perform set_config('request.jwt.claim.sub',b::text,true);
 insert into public.workspaces(id,name,owner_id) values(wb,'Temporary administration B',b);
 perform set_config('test.a',a::text,true); perform set_config('test.b',b::text,true);
 perform set_config('test.m',m::text,true);
 perform set_config('test.wa',wa::text,true); perform set_config('test.wb',wb::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$
declare company uuid; person uuid; service uuid; deal uuid; n integer; customer_date timestamptz;
begin
 update public.workspaces set legal_name='Temporary legal name',contact_email='test@example.invalid'
 where id=current_setting('test.wa')::uuid and version=1;
 get diagnostics n=row_count; if n<>1 then raise exception 'FAIL workspace details grant'; end if;
 if (select version from public.workspaces where id=current_setting('test.wa')::uuid)<>2 then raise exception 'FAIL workspace version'; end if;
 update public.profiles set full_name='Temporary profile' where id=auth.uid() and version=1;
 if (select version from public.profiles where id=auth.uid())<>2 then raise exception 'FAIL profile version'; end if;
 insert into public.companies(workspace_id,name,lifecycle_status) values(current_setting('test.wa')::uuid,'Temporary customer','customer') returning id,became_customer_at into company,customer_date;
 if customer_date is null then raise exception 'FAIL customer date'; end if;
 update public.companies set name='Revised customer' where id=company and version=1;
 update public.companies set name='Stale' where id=company and version=1;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL stale update'; end if;
 insert into public.contacts(workspace_id,company_id,name) values(current_setting('test.wa')::uuid,company,'Temporary contact') returning id into person;
 insert into public.services(workspace_id,name) values(current_setting('test.wa')::uuid,'Temporary service') returning id into service;
 begin
  insert into public.services(workspace_id,name) values(current_setting('test.wa')::uuid,' TEMPORARY SERVICE ');
  raise exception 'FAIL duplicate service';
 exception when unique_violation then null; end;
 insert into public.deals(workspace_id,company_id,contact_id,service_id,name)
 values(current_setting('test.wa')::uuid,company,person,service,'Temporary deal') returning id into deal;
 update public.contacts set active=false where id=person;
 update public.services set active=false where id=service;
 update public.companies set lifecycle_status='inactive' where id=company;
 if not exists(select 1 from public.deals where id=deal and company_id=company and contact_id=person and service_id=service) then raise exception 'FAIL preserved relationships'; end if;
 update public.deals set summary='Existing relationship remains editable' where id=deal;
 begin
  insert into public.contacts(workspace_id,company_id,name) values(current_setting('test.wa')::uuid,company,'Invalid inactive company');
  raise exception 'FAIL inactive company';
 exception when check_violation then null; end;
 begin
  insert into public.deals(workspace_id,service_id,name) values(current_setting('test.wa')::uuid,service,'Invalid inactive service');
  raise exception 'FAIL inactive service';
 exception when check_violation then null; end;
 update public.companies set lifecycle_status='customer' where id=company;
 if (select became_customer_at from public.companies where id=company) is distinct from customer_date then raise exception 'FAIL preserved customer date'; end if;
 begin
  insert into public.deals(workspace_id,company_id,contact_id,name) values(current_setting('test.wa')::uuid,company,person,'Invalid inactive contact');
  raise exception 'FAIL inactive contact';
 exception when check_violation then null; end;
 perform set_config('test.company',company::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.m'),true);
do $$ declare n integer; begin
 update public.workspaces set phone='Unauthorized' where id=current_setting('test.wa')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL member modified workspace'; end if;
 update public.companies set location='Member can operate CRM' where id=current_setting('test.company')::uuid;
 get diagnostics n=row_count; if n<>1 then raise exception 'FAIL member master access'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ declare n integer; begin
 if exists(select 1 from public.companies where id=current_setting('test.company')::uuid) then raise exception 'FAIL cross tenant read'; end if;
 update public.companies set name='Unauthorized' where id=current_setting('test.company')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL cross tenant update'; end if;
 begin
  insert into public.contacts(workspace_id,company_id,name) values(current_setting('test.wb')::uuid,current_setting('test.company')::uuid,'Invalid foreign company');
  raise exception 'FAIL cross tenant contact';
 exception when check_violation or foreign_key_violation then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform 1 from public.companies; raise exception 'FAIL anonymous read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: administration permissions, tenant isolation, stale edits, inactive links, duplicate services, customer date and preserved history. Fixtures rolled back.' result;
rollback;

