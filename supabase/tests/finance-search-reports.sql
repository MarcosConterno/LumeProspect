-- Executar inteiro APÓS 20260915120000_finance_search_reports.sql.
-- Teste transacional: todas as fixtures são desfeitas no ROLLBACK final.
begin;
create function pg_temp.search_assert(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $$;
create function pg_temp.search_reject(statement text,expected_state text) returns void language plpgsql as $$ begin
 begin execute statement;
 exception when others then if sqlstate=expected_state then return; end if; raise; end;
 raise exception 'FAIL: operation accepted: %',statement;
end $$;
do $$ declare root uuid; person uuid:=gen_random_uuid(); begin
 select user_id into strict root from private.platform_admins limit 1;
 insert into auth.users(id,email,email_confirmed_at) values(person,person::text||'@example.invalid',now());
 insert into public.profiles(id,full_name) values(person,'Search test member') on conflict do nothing;
 perform set_config('test.root',root::text,true);perform set_config('test.person',person::text,true);
 perform set_config('test.token',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
do $$ declare w uuid; other uuid; company uuid; cat uuid; expense uuid; first_entry uuid; id uuid; i integer; begin
 w:=(public.platform_manage('create_client',null,'{"name":"Search report A"}')->>'id')::uuid;
 other:=(public.platform_manage('create_client',null,'{"name":"Search report B"}')->>'id')::uuid;
 perform public.platform_manage('configure_client',w,'{"name":"Search report A","status":"active","version":1,"modules":{"financeiro":true}}');
 perform public.create_workspace_invite(w,current_setting('test.person')||'@example.invalid','member',current_setting('test.token'));
 insert into public.companies(workspace_id,name) values(w,'Alpha relatório') returning id into company;
 select id into strict cat from public.finance_categories where workspace_id=w and name='Serviços' and kind='receivable';
 select id into strict expense from public.finance_categories where workspace_id=w and name='Marketing' and kind='payable';
 for i in 1..32 loop
  id:=gen_random_uuid();
  perform public.finance_save_entry(w,jsonb_build_object('id',id,'type','receivable','companyId',company,'categoryId',cat,
   'description','Contrato '||i,'dueDate','2000-02-29','amountCents',10001));
  if i=1 then first_entry:=id; end if;
 end loop;
 perform public.finance_settle(w,jsonb_build_object('id',gen_random_uuid(),'entryId',first_entry,'version',1,'amountCents',1000,'paidOn','2000-01-15'));
 perform public.finance_save_entry(w,jsonb_build_object('id',gen_random_uuid(),'type','receivable','companyId',company,'categoryId',cat,'description','January boundary','dueDate','2000-01-31','amountCents',100));
 perform public.finance_save_entry(w,jsonb_build_object('id',gen_random_uuid(),'type','receivable','companyId',company,'categoryId',cat,'description','March boundary','dueDate','2000-03-01','amountCents',5000));
 perform public.finance_save_entry(w,jsonb_build_object('id',gen_random_uuid(),'type','payable','companyId',company,'categoryId',expense,'description','Marketing payable','dueDate','2000-02-29','amountCents',20000));
 perform set_config('test.wa',w::text,true);perform set_config('test.wb',other::text,true);
 perform set_config('test.company',company::text,true);perform set_config('test.category',cat::text,true);
 select id into strict cat from public.finance_categories where workspace_id=other and name='Serviços' and kind='receivable';
 perform set_config('test.foreign_category',cat::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.person'),true);
select public.accept_workspace_invite(current_setting('test.token'));
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.person')::uuid,'member',true,
 '[{"module":"financeiro","read":true,"create":false,"update":false,"delete":false,"settle":false,"reverse":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.person'),true);
do $$ declare w uuid:=current_setting('test.wa')::uuid;
 filters jsonb:=jsonb_build_object('dateFrom','2000-02-01','dateTo','2000-02-29','type','receivable','categoryId',current_setting('test.category'),'companyQuery','ALPHA','minAmountCents',10001,'maxAmountCents',10001,'page',1);
 a jsonb; b jsonb; report jsonb; begin
 perform pg_temp.search_assert(not public.module_access(w,'crm','read'),'finance-only user fixture');
 a:=public.finance_search_entries(w,filters);
 b:=public.finance_search_entries(w,filters||'{"page":2}');
 report:=public.finance_search_entries(w,filters,true);
 perform pg_temp.search_assert((a->>'count')::int=32 and jsonb_array_length(a->'entries')=30,'combined filters applied before pagination');
 perform pg_temp.search_assert((b->>'page')::int=2 and jsonb_array_length(b->'entries')=2,'second page');
 perform pg_temp.search_assert(jsonb_array_length(report->'entries')=32 and (report->>'count')::int=32,'report exports all pages');
 perform pg_temp.search_assert(a->'totals'=report->'totals' and (report#>>'{totals,receivable}')::bigint=319032 and (report#>>'{totals,received}')::bigint=1000,'same totals including payment outside due period');
 perform pg_temp.search_assert((a#>'{entries,0}')=(report#>'{entries,0}') and (b#>'{entries,0}')=(report#>'{entries,30}'),'stable report ordering');
 a:=public.finance_search_entries(w,filters||'{"dateFrom":"2000-02-29","dateTo":"2000-02-29"}');
 perform pg_temp.search_assert((a->>'count')::int=32,'single day inclusive leap date');
 a:=public.finance_search_entries(w,'{"dateFrom":"2000-01-01","dateTo":"2000-12-31"}');
 perform pg_temp.search_assert((a->>'count')::int=35,'full year includes January March and payable');
 a:=public.finance_search_entries(w,filters||'{"status":"partial"}');
 perform pg_temp.search_assert((a->>'count')::int=1,'partial status combined with amount');
 a:=public.finance_search_entries(w,filters||'{"query":"no such entry"}');
 perform pg_temp.search_assert((a->>'count')::int=0 and jsonb_array_length(a->'entries')=0 and (a#>>'{totals,receivable}')::bigint=0,'empty result');
 a:=public.finance_search_entries(w,filters||'{"page":999}');
 perform pg_temp.search_assert((a->>'page')::int=2,'page clamped after result changes');
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L,true)',current_setting('test.wb'),filters),'42501');
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L)',w,filters||jsonb_build_object('categoryId',current_setting('test.foreign_category'))),'23514');
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L)',w,filters||'{"dateFrom":"2000-03-01"}'),'23514');
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L)',w,filters||'{"minAmountCents":10002}'),'23514');
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L)',w,filters||'{"status":"invalid"}'),'23514');
end $$;
-- Privileged fixture setup for report-size guard, without thousands of audit RPCs.
reset role;
insert into public.finance_entries(id,workspace_id,company_id,category_id,kind,description,due_date,amount_cents)
select gen_random_uuid(),current_setting('test.wa')::uuid,current_setting('test.company')::uuid,current_setting('test.category')::uuid,
 'receivable','Report size fixture '||n,date '2001-01-01',100 from generate_series(1,5001) n;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.person'),true);
do $$ begin
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L,true)',current_setting('test.wa'),'{"dateFrom":"2001-01-01","dateTo":"2001-01-01"}'),'54000');
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.manage_member(current_setting('test.wa')::uuid,current_setting('test.person')::uuid,'member',true,
 '[{"module":"financeiro","read":false,"create":false,"update":false,"delete":false,"settle":false,"reverse":false}]');
select set_config('request.jwt.claim.sub',current_setting('test.person'),true);
do $$ begin
 perform pg_temp.search_reject(format('select public.finance_search_entries(%L,%L,true)',current_setting('test.wa'),'{"dateFrom":"2000-01-01","dateTo":"2000-12-31"}'),'42501');
end $$;
set local role anon;
do $$ begin
 begin perform public.finance_search_entries(current_setting('test.wa')::uuid,'{"dateFrom":"2000-01-01","dateTo":"2000-12-31"}',true);
  raise exception 'FAIL: anonymous report accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: financial search, combined filters, exact cents, dates, pagination, report parity, totals, size limit, isolation and revoked access. All fixtures rolled back.' as result;
rollback;
