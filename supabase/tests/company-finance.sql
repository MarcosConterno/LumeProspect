-- Execute depois de 20260914220000_company_finance.sql, no SQL Editor.
-- Fixtures temporárias: nenhuma conta real é modificada. Execute o arquivo inteiro.
begin;

do $$ begin
 if to_regprocedure('public.finance_snapshot(uuid,jsonb)') is null
    or to_regclass('public.finance_payments') is null
    or not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='finance_entries') then
  raise exception 'Estrutura financeira incompleta: confira o resultado da migration antes de testar.';
 end if;
end $$;

create function pg_temp.finance_assert(ok boolean, label text) returns void
language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $$;
create function pg_temp.finance_reject(statement text, expected_state text) returns void
language plpgsql as $$ begin
 begin execute statement;
 exception when others then
  if sqlstate=expected_state then return; end if;
  raise;
 end;
 raise exception 'FAIL: operation accepted: %',statement;
end $$;

do $$ declare root uuid; a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); begin
 select user_id into strict root from private.platform_admins limit 1;
 insert into auth.users(id,email,email_confirmed_at) values
 (a,a::text||'@example.invalid',now()),(m,m::text||'@example.invalid',now());
 insert into public.profiles(id,full_name) values(a,'Finance test admin'),(m,'Finance test member') on conflict do nothing;
 perform set_config('test.root',root::text,true);
 perform set_config('test.admin',a::text,true);
 perform set_config('test.member',m::text,true);
 perform set_config('test.ta',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
 perform set_config('test.tm',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ declare a uuid; b uuid; c uuid; begin
 a:=(public.platform_manage('create_client',null,'{"name":"Finance test A"}')->>'id')::uuid;
 b:=(public.platform_manage('create_client',null,'{"name":"Finance test B"}')->>'id')::uuid;
 perform public.platform_manage('configure_client',a,'{"name":"Finance test A","status":"active","version":1,"modules":{"crm":true,"financeiro":true}}');
 perform public.platform_manage('configure_client',b,'{"name":"Finance test B","status":"active","version":1,"modules":{"crm":true,"financeiro":true}}');
 perform public.create_workspace_invite(a,current_setting('test.admin')||'@example.invalid','admin',current_setting('test.ta'));
 perform public.create_workspace_invite(a,current_setting('test.member')||'@example.invalid','member',current_setting('test.tm'));
 insert into public.companies(workspace_id,name) values(b,'Finance foreign company') returning id into c;
 perform set_config('test.foreign_company',c::text,true);
 perform set_config('test.wa',a::text,true); perform set_config('test.wb',b::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.accept_workspace_invite(current_setting('test.ta'));
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
select public.accept_workspace_invite(current_setting('test.tm'));
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);

do $$ declare w uuid:=current_setting('test.wa')::uuid; c uuid; cat uuid; expense uuid;
 e uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); payload jsonb; payment jsonb; snap jsonb; begin
 perform pg_temp.finance_assert((select count(*)=11 from public.finance_categories where workspace_id=w),'seed categories');
 insert into public.companies(workspace_id,name) values(w,'Finance local company') returning id into c;
 select id into strict cat from public.finance_categories where workspace_id=w and name='Serviços' and kind='receivable';
 select id into strict expense from public.finance_categories where workspace_id=w and name='Marketing' and kind='payable';
 payload:=jsonb_build_object('id',e,'type','receivable','companyId',c,'categoryId',cat,'description','Finance test invoice','dueDate','2000-02-10','amountCents',10000,'notes','');
 perform set_config('test.payload',payload::text,true); perform set_config('test.entry',e::text,true);
 perform pg_temp.finance_reject(format('select public.finance_save_entry(%L,%L)',w,payload||jsonb_build_object('companyId',current_setting('test.foreign_company'))),'23514');
 perform pg_temp.finance_reject(format('select public.finance_save_entry(%L,%L)',w,payload||jsonb_build_object('categoryId',expense)),'23514');
 perform public.finance_save_entry(w,payload);
 perform pg_temp.finance_assert(not exists(select 1 from public.finance_categories where workspace_id=current_setting('test.wb')::uuid),'RLS isolation');
 perform pg_temp.finance_reject(format('select public.finance_snapshot(%L,%L)',current_setting('test.wb'),'{"month":"2000-02"}'),'42501');
 perform pg_temp.finance_assert(jsonb_array_length(public.finance_search_companies(w,'Finance'))=1,'company search isolation');
 payment:=jsonb_build_object('id',p,'entryId',e,'version',1,'amountCents',4000,'paidOn','2000-01-15','notes','Partial payment');
 perform public.finance_settle(w,payment);
 perform public.finance_settle(w,payment);
 perform pg_temp.finance_assert((select count(*)=1 from public.finance_payments where entry_id=e),'retry must not duplicate payment');
 perform pg_temp.finance_reject(format('select public.finance_settle(%L,%L)',w,payment||jsonb_build_object('id',gen_random_uuid(),'version',2,'amountCents',6001)),'23514');
 perform pg_temp.finance_reject(format('select public.finance_save_entry(%L,%L)',w,payload||'{"version":1}'),'40001');
 perform pg_temp.finance_reject(format('select public.finance_save_entry(%L,%L)',w,payload||'{"version":2,"amountCents":12000}'),'23514');
 perform pg_temp.finance_reject(format('select public.finance_cancel_entry(%L,%L)',w,jsonb_build_object('id',e,'version',2,'reason','Test cancellation')),'23514');
 snap:=public.finance_snapshot(w,'{"month":"2000-02"}');
 perform pg_temp.finance_assert((snap#>>'{totals,receivable}')::bigint=6000 and (snap#>>'{totals,received}')::bigint=0,'due month totals');
 snap:=public.finance_snapshot(w,'{"month":"2000-01","query":"no match"}');
 perform pg_temp.finance_assert((snap#>>'{totals,received}')::bigint=4000 and (snap->>'count')::int=0,'paid month independent of list');
 perform public.finance_reverse_payment(w,jsonb_build_object('id',p,'entryId',e,'version',2,'reason','Test reversal'));
 snap:=public.finance_snapshot(w,'{"month":"2000-01"}');
 perform pg_temp.finance_assert((snap#>>'{totals,received}')::bigint=0,'reversal recomputes original month');
 perform public.finance_cancel_entry(w,jsonb_build_object('id',e,'version',3,'reason','Test cancellation'));
 snap:=public.finance_snapshot(w,'{"month":"2000-02","status":"cancelled"}');
 perform pg_temp.finance_assert((snap->>'count')::int=1 and (snap#>>'{totals,receivable}')::bigint=0,'cancelled entry excluded from totals');
 perform pg_temp.finance_assert(jsonb_array_length(public.finance_entry_detail(w,e)->'history')=4,'history retained');
 -- A payable in the same month verifies outgoing cash and the annual net.
 e:=gen_random_uuid();
 perform public.finance_save_entry(w,payload||jsonb_build_object('id',e,'type','payable','categoryId',expense,'amountCents',2500));
 perform set_config('test.payable',e::text,true);
 perform public.finance_settle(w,jsonb_build_object('id',gen_random_uuid(),'entryId',e,'version',1,'amountCents',2500,'paidOn','2000-02-10'));
 snap:=public.finance_snapshot(w,'{"month":"2000-02"}');
 perform pg_temp.finance_assert((snap#>>'{totals,paid}')::bigint=2500 and (snap#>>'{totals,payable}')::bigint=0 and (snap#>>'{monthly,1,value}')::bigint=-2500,'outgoing cash and annual net');
 perform pg_temp.finance_assert((snap#>>'{expenses,0,value}')::bigint=2500,'expense categories');
end $$;
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'member',true,
 '[{"module":"financeiro","read":true,"create":false,"update":false,"delete":false,"settle":false,"reverse":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
do $$ declare w uuid:=current_setting('test.wa')::uuid; begin
 perform public.finance_snapshot(w,'{"month":"2000-02"}');
 perform pg_temp.finance_reject(format('select public.finance_save_entry(%L,%L)',w,current_setting('test.payload')),'42501');
 perform pg_temp.finance_reject(format('select public.finance_save_category(%L,%L)',w,'{"name":"Forbidden","kind":"payable"}'),'42501');
 perform pg_temp.finance_reject(format('select public.finance_settle(%L,%L)',w,'{}'),'42501');
 perform pg_temp.finance_reject(format('select public.finance_reverse_payment(%L,%L)',w,'{}'),'42501');
 perform pg_temp.finance_reject(format('select public.finance_cancel_entry(%L,%L)',w,'{}'),'42501');
 perform pg_temp.finance_reject('update public.finance_entries set description=''Forbidden''','42501');
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'member',true,
 '[{"module":"financeiro","read":true,"create":false,"update":false,"delete":false,"settle":true,"reverse":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
do $$ declare w uuid:=current_setting('test.wa')::uuid; begin
 perform pg_temp.finance_assert(public.module_access(w,'financeiro','settle') and not public.module_access(w,'financeiro','reverse'),'separate settlement and reversal rights');
 -- Reaches business validation, proving settle is allowed independently of create/update.
 perform pg_temp.finance_reject(format('select public.finance_settle(%L,%L)',w,jsonb_build_object('id',gen_random_uuid(),'entryId',current_setting('test.payable'),'version',2,'amountCents',1,'paidOn','2000-02-10')),'23514');
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.member')::uuid,'member',true,
 '[{"module":"financeiro","read":false,"create":false,"update":false,"delete":false,"settle":false,"reverse":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
do $$ begin
 perform pg_temp.finance_reject(format('select public.finance_snapshot(%L,%L)',current_setting('test.wa'),'{"month":"2000-02"}'),'42501');
 perform pg_temp.finance_assert(not exists(select 1 from public.finance_entries),'revoked RLS read');
end $$;
set local role anon;
do $$ begin
 begin perform public.finance_snapshot(current_setting('test.wa')::uuid,'{"month":"2000-02"}');
  raise exception 'FAIL: anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: finance isolation, permissions, categories, partial settlement, retry, overpayment, versions, reversal, cancellation, history and totals. Fixtures rolled back.' as result;
rollback;
