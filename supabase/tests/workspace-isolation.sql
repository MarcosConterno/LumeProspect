begin;
do $$
declare ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid(); um uuid:=gen_random_uuid();
 wa uuid:=gen_random_uuid(); wb uuid:=gen_random_uuid();
 ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid(); pa uuid:=gen_random_uuid(); pb uuid:=gen_random_uuid();
 da uuid:=gen_random_uuid(); db uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(ua),(ub),(um);
 insert into public.profiles(id,full_name) values(ua,'Teste owner A'),(ub,'Teste owner B'),(um,'Teste membro');
 perform set_config('request.jwt.claim.sub',ua::text,true);
 insert into public.workspaces(id,name,owner_id) values(wa,'Teste A',ua);
 perform set_config('request.jwt.claim.sub',ub::text,true);
 insert into public.workspaces(id,name,owner_id) values(wb,'Teste B',ub);
 insert into public.workspace_members(workspace_id,user_id,role) values(wa,um,'member');
 insert into public.companies(id,workspace_id,name) values(ca,wa,'Cliente A'),(cb,wb,'Cliente B');
 insert into public.prospects(id,workspace_id,name,company_id) values(pa,wa,'Prospect A',ca),(pb,wb,'Prospect B',cb);
 insert into public.contacts(workspace_id,company_id,name) values(wa,ca,'Contato A'),(wb,cb,'Contato B');
 perform set_config('request.jwt.claim.sub',ua::text,true);
 insert into public.deals(id,workspace_id,name,company_id,prospect_id) values(da,wa,'Negócio A',ca,pa);
 perform set_config('request.jwt.claim.sub',ub::text,true);
 insert into public.deals(id,workspace_id,name,company_id,prospect_id) values(db,wb,'Negócio B',cb,pb);
 perform set_config('test.ua',ua::text,true); perform set_config('test.ub',ub::text,true);
 perform set_config('test.um',um::text,true); perform set_config('test.wa',wa::text,true); perform set_config('test.wb',wb::text,true);
 perform set_config('test.ca',ca::text,true); perform set_config('test.cb',cb::text,true); perform set_config('test.pb',pb::text,true);
 perform set_config('test.da',da::text,true); perform set_config('test.db',db::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.um'),true);
do $$
declare n integer;
begin
 if (select count(*) from public.companies)<>1 then raise exception 'FAIL company isolation'; end if;
 if (select count(*) from public.contacts)<>1 then raise exception 'FAIL contact isolation'; end if;
 if (select count(*) from public.deals)<>1 then raise exception 'FAIL deal isolation'; end if;
 if (select count(*) from public.prospects)<>1 then raise exception 'FAIL prospect isolation'; end if;
 update public.deals set name='Own change' where id=current_setting('test.da')::uuid;
 get diagnostics n=row_count; if n<>1 then raise exception 'FAIL own update'; end if;
 update public.deals set name='Cross change' where id=current_setting('test.db')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL cross update'; end if;
 delete from public.deals where id=current_setting('test.da')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL member delete'; end if;
 begin
  insert into public.companies(workspace_id,name) values(current_setting('test.wb')::uuid,'Intruder');
  raise exception 'FAIL cross insert';
 exception when insufficient_privilege then null; end;
 begin
  update public.workspace_members set role='admin' where user_id=current_setting('test.um')::uuid;
  get diagnostics n=row_count; if n<>0 then raise exception 'FAIL self promotion'; end if;
 end;
 begin
  update public.deals set prospect_id=current_setting('test.pb')::uuid where id=current_setting('test.da')::uuid;
  raise exception 'FAIL cross prospect FK';
 exception when foreign_key_violation then null; end;
 begin
  update public.deals set company_id=current_setting('test.cb')::uuid where id=current_setting('test.da')::uuid;
  raise exception 'FAIL cross company FK';
 exception when foreign_key_violation then null; end;
 begin
  insert into private.platform_admins(user_id) values(current_setting('test.um')::uuid);
  raise exception 'FAIL platform escalation';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.ua'),true);
do $$
begin
 update public.workspace_members set role='admin' where user_id=current_setting('test.um')::uuid;
 if (select role from public.workspace_members where user_id=current_setting('test.um')::uuid)<>'admin' then raise exception 'FAIL owner promotion'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.um'),true);
do $$
begin
 begin
  insert into public.workspace_members(workspace_id,user_id,role)
  values(current_setting('test.wb')::uuid,current_setting('test.um')::uuid,'member');
  raise exception 'FAIL admin cross membership';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.workspace_members(workspace_id,user_id,role)
  values(current_setting('test.wa')::uuid,current_setting('test.ub')::uuid,'owner');
  raise exception 'FAIL admin creates owner';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Give the user both workspaces to prove FKs and immutable tenancy do not rely only on RLS.
insert into public.workspace_members(workspace_id,user_id,role) values(current_setting('test.wb')::uuid,current_setting('test.um')::uuid,'member');
set local role authenticated;
do $$
begin
 begin
  update public.companies set workspace_id=current_setting('test.wb')::uuid where id=current_setting('test.ca')::uuid;
  raise exception 'FAIL tenant transfer';
 exception when check_violation then null; end;
 begin
  update public.deals set prospect_id=current_setting('test.pb')::uuid where id=current_setting('test.da')::uuid;
  raise exception 'FAIL multiworkspace cross FK';
 exception when foreign_key_violation then null; end;
end $$;
reset role;
update public.workspaces set status='suspended' where id=current_setting('test.wa')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.ua'),true);
do $$ begin
 if exists(select 1 from public.deals) then raise exception 'FAIL suspended access'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.companies; raise exception 'FAIL anon read'; exception when insufficient_privilege then null; end;
 begin insert into public.companies(workspace_id,name) values(current_setting('test.wa')::uuid,'Anon'); raise exception 'FAIL anon write'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.ub'),true);
do $$
declare aid uuid; sid uuid; n integer;
begin
 insert into public.services(workspace_id,name) values(current_setting('test.wb')::uuid,'Consultoria') returning id into sid;
 update public.deals set service_id=sid,owner_id=current_setting('test.ub')::uuid,stage='proposal',status='open'
 where id=current_setting('test.db')::uuid;
 if (select version from public.deals where id=current_setting('test.db')::uuid)<>2 then raise exception 'FAIL deal version'; end if;
 begin
  update public.deals set status='lost',lost_reason='' where id=current_setting('test.db')::uuid;
  raise exception 'FAIL lost reason';
 exception when check_violation then null; end;
 update public.deals set status='won' where id=current_setting('test.db')::uuid;
 if (select closed_at from public.deals where id=current_setting('test.db')::uuid) is null then raise exception 'FAIL closed_at'; end if;
 insert into public.deal_activities(workspace_id,deal_id,type,title,scheduled_at)
 values(current_setting('test.wb')::uuid,current_setting('test.db')::uuid,'call','Retornar ligação',now()) returning id into aid;
 update public.deal_activities set status='completed' where id=aid;
 if (select completed_at from public.deal_activities where id=aid) is null then raise exception 'FAIL completed_at'; end if;
 if (select count(*) from public.deal_history where deal_id=current_setting('test.db')::uuid)<>3 then raise exception 'FAIL history'; end if;
 begin
  delete from public.deal_history;
  raise exception 'FAIL history tampering';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.deal_activities(workspace_id,deal_id,type,title)
  values(current_setting('test.wb')::uuid,current_setting('test.da')::uuid,'task','Intruder');
  raise exception 'FAIL activity cross FK';
 exception when foreign_key_violation then null; end;
 update public.deals set name='Proposta consultoria' where id=current_setting('test.db')::uuid;
 if not exists(select 1 from public.deals where search_vector @@ plainto_tsquery('portuguese','consultoria')) then raise exception 'FAIL indexed search'; end if;
 update public.deals set summary='Concurrent update' where id=current_setting('test.db')::uuid and version=1;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL stale version'; end if;
end $$;
reset role;
rollback;
select 'PASS: isolation, own updates, cross writes, roles, composite FKs, immutable tenant, suspension, anonymous denial. All fixtures rolled back.' as result;
