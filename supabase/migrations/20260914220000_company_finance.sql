-- PENDENTE: executar inteiro no SQL Editor do Supabase, uma única vez.
-- Não contém lançamentos de demonstração. Todas as alterações são transacionais.
begin;

alter table public.member_permissions
 add column can_settle boolean not null default false,
 add column can_reverse boolean not null default false;
alter table public.member_permissions add constraint finance_permissions_require_read
 check ((can_read or not (can_settle or can_reverse)) and (module='financeiro' or not (can_settle or can_reverse)));

create or replace function private.module_access(target uuid, product text, operation text) returns boolean
language sql stable security definer set search_path='' as $$
 select case
 when operation not in ('read','create','update','delete','settle','reverse') then false
 when operation in ('settle','reverse') and product<>'financeiro' then false
 when private.is_lume_master() then exists(select 1 from public.workspaces where id=target)
 when private.workspace_role(target) is null then false
 when not exists(select 1 from public.workspace_modules where workspace_id=target and module=product and enabled) then false
 when private.workspace_role(target) in ('owner','admin') then true
 else coalesce((select case operation when 'read' then can_read when 'create' then can_create when 'update' then can_update when 'delete' then can_delete when 'settle' then can_settle when 'reverse' then can_reverse else false end
 from public.member_permissions where workspace_id=target and user_id=auth.uid() and module=product),false) end
$$;

create or replace function private.manage_member(target uuid, person uuid, member_role text, enabled boolean, permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; existing public.workspace_members;
begin
 if auth.uid() is null or coalesce(private.workspace_role(target),'') not in ('owner','admin') then raise exception 'Admin required' using errcode='42501'; end if;
 perform 1 from public.workspaces where id=target for update;
 select * into existing from public.workspace_members where workspace_id=target and user_id=person for update;
 if not found or person=auth.uid() or existing.role='owner' or exists(select 1 from private.platform_admins where user_id=person) then raise exception 'Protected account' using errcode='42501'; end if;
 if member_role not in ('admin','member') or enabled is null or permissions is null or jsonb_typeof(permissions)<>'array' then raise exception 'Invalid permissions' using errcode='23514'; end if;
 if existing.active and existing.role='admin' and (not enabled or member_role<>'admin') and not exists(select 1 from public.workspace_members where workspace_id=target and user_id<>person and active and role in ('owner','admin')) then
  raise exception 'Cannot remove last company administrator' using errcode='23514'; end if;
 update public.workspace_members set role=member_role,active=enabled where workspace_id=target and user_id=person;
 for item in select * from jsonb_array_elements(permissions) loop
  insert into public.member_permissions(workspace_id,user_id,module,can_read,can_create,can_update,can_delete,can_settle,can_reverse)
  values(target,person,item->>'module',(item->>'read')::boolean,(item->>'create')::boolean,(item->>'update')::boolean,(item->>'delete')::boolean,
   case when item->>'module'='financeiro' then coalesce((item->>'settle')::boolean,false) else false end,
   case when item->>'module'='financeiro' then coalesce((item->>'reverse')::boolean,false) else false end)
  on conflict(workspace_id,user_id,module) do update set can_read=excluded.can_read,can_create=excluded.can_create,can_update=excluded.can_update,can_delete=excluded.can_delete,can_settle=excluded.can_settle,can_reverse=excluded.can_reverse;
 end loop;
end $$;

create table public.finance_categories (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 name text not null check(length(trim(name)) between 2 and 80),
 kind text not null check(kind in ('receivable','payable')),
 active boolean not null default true,
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,id,kind)
);
create unique index finance_category_name_unique on public.finance_categories(workspace_id,kind,lower(trim(name)));
create table public.finance_entries (
 id uuid primary key,
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 company_id uuid not null,
 category_id uuid not null,
 kind text not null check(kind in ('receivable','payable')),
 description text not null check(length(trim(description)) between 2 and 160),
 due_date date not null check(due_date between date '1900-01-01' and date '2100-12-31'),
 amount_cents bigint not null check(amount_cents between 1 and 999999999999),
 notes text not null default '' check(length(notes)<=4000),
 cancelled_at timestamptz,
 cancel_reason text,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0),
 unique(workspace_id,id),
 foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete restrict,
 foreign key(workspace_id,category_id,kind) references public.finance_categories(workspace_id,id,kind) on delete restrict,
 check((cancelled_at is null and cancel_reason is null) or (cancelled_at is not null and cancel_reason is not null and length(trim(cancel_reason)) between 3 and 500))
);
create index finance_entries_due_idx on public.finance_entries(workspace_id,due_date,id);
create index finance_entries_company_idx on public.finance_entries(workspace_id,company_id);
create index finance_entries_category_idx on public.finance_entries(workspace_id,category_id,kind);
create index finance_entries_creator_idx on public.finance_entries(created_by);

create table public.finance_payments (
 id uuid primary key,
 workspace_id uuid not null,
 entry_id uuid not null,
 amount_cents bigint not null check(amount_cents between 1 and 999999999999),
 paid_on date not null check(paid_on between date '1900-01-01' and date '2100-12-31'),
 notes text not null default '' check(length(notes)<=1000),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 reversed_at timestamptz,
 reversed_by uuid references public.profiles(id) on delete set null,
 reverse_reason text,
 foreign key(workspace_id,entry_id) references public.finance_entries(workspace_id,id) on delete restrict,
 check((reversed_at is null and reversed_by is null and reverse_reason is null)
   or (reversed_at is not null and reverse_reason is not null and length(trim(reverse_reason)) between 3 and 500))
);
create index finance_payments_entry_idx on public.finance_payments(workspace_id,entry_id);
create index finance_payments_date_idx on public.finance_payments(workspace_id,paid_on) where reversed_at is null;
create index finance_payments_creator_idx on public.finance_payments(created_by);
create index finance_payments_reverser_idx on public.finance_payments(reversed_by);
create table public.finance_history (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 entry_id uuid,
 actor_id uuid references public.profiles(id) on delete set null,
 event text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now(),
 foreign key(workspace_id,entry_id) references public.finance_entries(workspace_id,id) on delete restrict
);
create index finance_history_entry_idx on public.finance_history(workspace_id,entry_id,created_at desc,id);
create index finance_history_actor_idx on public.finance_history(actor_id);

-- Clients may SELECT under RLS; mutations exclusively use guarded transactional RPCs.
do $$ declare t text; begin
 foreach t in array array['finance_categories','finance_entries','finance_payments','finance_history'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy finance_read on public.%I for select to authenticated using(private.module_access(workspace_id,''financeiro'',''read''))',t);
 end loop;
end $$;

create function private.finance_seed_categories(target uuid) returns void language sql set search_path='' as $$
 insert into public.finance_categories(workspace_id,name,kind)
 select target,v.name,v.kind from (values
 ('Serviços','receivable'),('Projetos','receivable'),('Mensalidades','receivable'),('Outras receitas','receivable'),
 ('Ferramentas e assinaturas','payable'),('Marketing','payable'),('Administrativo','payable'),
 ('Estrutura','payable'),('Impostos e taxas','payable'),('Pessoal','payable'),('Outras despesas','payable')
 ) v(name,kind) on conflict do nothing
$$;
revoke all on function private.finance_seed_categories(uuid) from public,anon,authenticated;
select private.finance_seed_categories(id) from public.workspaces;
create function private.finance_seed_new_workspace() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.finance_seed_categories(new.id); return new; end $$;
revoke all on function private.finance_seed_new_workspace() from public,anon,authenticated;
create trigger finance_seed_new_workspace after insert on public.workspaces for each row execute function private.finance_seed_new_workspace();

create function private.finance_guard(target uuid, operation text) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(private.module_access(target,'financeiro',operation),false) then raise exception 'Finance access denied' using errcode='42501'; end if;
end $$;
revoke all on function private.finance_guard(uuid,text) from public,anon,authenticated;

-- SECURITY DEFINER is intentional: validates financial access before exposing
-- ONLY company id/name, including when the account did not license CRM.
create function private.finance_search_companies(target uuid, query text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.finance_guard(target,'read');
 if length(trim(coalesce(query,'')))<2 then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(x) from (
  select c.id,c.name from public.companies c
  where c.workspace_id=target and c.lifecycle_status<>'inactive'
   and position(lower(left(trim(query),100)) in lower(c.name))>0
  order by c.name,c.id limit 15
 ) x),'[]'::jsonb);
end $$;

create function private.finance_save_category(target uuid, payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid:=coalesce((payload->>'id')::uuid,gen_random_uuid()); old_row public.finance_categories;
begin
 perform private.finance_guard(target,'read');
 if coalesce(private.workspace_role(target),'') not in ('owner','admin') then raise exception 'Admin required' using errcode='42501'; end if;
 select * into old_row from public.finance_categories where workspace_id=target and id=cid for update;
 if found then
  if old_row.version is distinct from (payload->>'version')::integer then raise exception 'Concurrent edit' using errcode='40001'; end if;
  if old_row.kind is distinct from payload->>'kind' then raise exception 'Category kind is immutable' using errcode='23514'; end if;
  update public.finance_categories set name=trim(payload->>'name'),active=(payload->>'active')::boolean,version=version+1,updated_at=now() where id=cid;
 else
  if payload->>'version' is not null then raise exception 'Category unavailable' using errcode='40001'; end if;
  insert into public.finance_categories(id,workspace_id,name,kind,active) values(cid,target,trim(payload->>'name'),payload->>'kind',coalesce((payload->>'active')::boolean,true));
 end if;
 insert into public.finance_history(workspace_id,actor_id,event,details)
 values(target,auth.uid(),'category.saved',jsonb_build_object('before',to_jsonb(old_row),'after',(select to_jsonb(c) from public.finance_categories c where id=cid)));
 return cid;
end $$;

create function private.finance_save_entry(target uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid:=(payload->>'id')::uuid; old_row public.finance_entries; has_payments boolean; is_update boolean;
begin
 perform private.finance_guard(target,case when payload->>'version' is null then 'create' else 'update' end);
 if eid is null then raise exception 'Entry id required' using errcode='23514'; end if;
 select * into old_row from public.finance_entries where workspace_id=target and id=eid for update;
 is_update:=found;
 if is_update then
  perform private.finance_guard(target,'update');
  if old_row.version is distinct from (payload->>'version')::integer then raise exception 'Concurrent edit' using errcode='40001'; end if;
  if old_row.cancelled_at is not null then raise exception 'Entry cancelled' using errcode='23514'; end if;
  select exists(select 1 from public.finance_payments where workspace_id=target and entry_id=eid) into has_payments;
  if has_payments and (old_row.amount_cents is distinct from (payload->>'amountCents')::bigint
    or old_row.company_id is distinct from (payload->>'companyId')::uuid
    or old_row.category_id is distinct from (payload->>'categoryId')::uuid
    or old_row.kind is distinct from payload->>'type') then
   raise exception 'Entry has payment history' using errcode='23514'; end if;
 else
  if payload->>'version' is not null then raise exception 'Entry unavailable' using errcode='40001'; end if;
 end if;
 if not is_update or old_row.company_id is distinct from (payload->>'companyId')::uuid then
  perform 1 from public.companies where workspace_id=target and id=(payload->>'companyId')::uuid and lifecycle_status<>'inactive' for share;
  if not found then raise exception 'Company unavailable' using errcode='23514'; end if;
 end if;
 if not is_update or old_row.category_id is distinct from (payload->>'categoryId')::uuid or old_row.kind is distinct from payload->>'type' then
  perform 1 from public.finance_categories where workspace_id=target and id=(payload->>'categoryId')::uuid and kind=payload->>'type' and active for share;
  if not found then raise exception 'Category unavailable' using errcode='23514'; end if;
 end if;
 if is_update then
  update public.finance_entries set company_id=(payload->>'companyId')::uuid,category_id=(payload->>'categoryId')::uuid,
   kind=payload->>'type',description=trim(payload->>'description'),due_date=(payload->>'dueDate')::date,
   amount_cents=(payload->>'amountCents')::bigint,notes=coalesce(payload->>'notes',''),updated_at=now(),version=version+1
   where workspace_id=target and id=eid;
 else
  insert into public.finance_entries(id,workspace_id,company_id,category_id,kind,description,due_date,amount_cents,notes,created_by)
  values(eid,target,(payload->>'companyId')::uuid,(payload->>'categoryId')::uuid,payload->>'type',
   trim(payload->>'description'),(payload->>'dueDate')::date,(payload->>'amountCents')::bigint,coalesce(payload->>'notes',''),auth.uid());
 end if;
 insert into public.finance_history(workspace_id,entry_id,actor_id,event,details) values(target,eid,auth.uid(),case when is_update then 'entry.updated' else 'entry.created' end,
  jsonb_build_object('before',to_jsonb(old_row),'after',(select to_jsonb(e) from public.finance_entries e where id=eid)));
 return eid;
end $$;

create function private.finance_settle(target uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare entry public.finance_entries; existing public.finance_payments; pid uuid:=(payload->>'id')::uuid;
 amount bigint:=(payload->>'amountCents')::bigint; total bigint; paid_date date:=(payload->>'paidOn')::date;
begin
 perform private.finance_guard(target,'settle');
 select * into entry from public.finance_entries where workspace_id=target and id=(payload->>'entryId')::uuid for update;
 if not found then raise exception 'Entry unavailable' using errcode='23514'; end if;
 -- A retried HTTP request with the same ID cannot create a duplicate payment.
 select * into existing from public.finance_payments where id=pid and workspace_id=target;
 if found then
  if existing.entry_id=entry.id and existing.amount_cents=amount and existing.paid_on=paid_date and existing.created_by=auth.uid() and existing.reversed_at is null then return pid; end if;
  raise exception 'Payment request already used' using errcode='23514';
 end if;
 if entry.version is distinct from (payload->>'version')::integer then raise exception 'Concurrent edit' using errcode='40001'; end if;
 if entry.cancelled_at is not null then raise exception 'Entry cancelled' using errcode='23514'; end if;
 if pid is null or amount is null or amount<1 or paid_date is null or paid_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Invalid settlement' using errcode='23514'; end if;
 select coalesce(sum(amount_cents),0) into total from public.finance_payments where workspace_id=target and entry_id=entry.id and reversed_at is null;
 if total+amount>entry.amount_cents then raise exception 'Payment exceeds outstanding balance' using errcode='23514'; end if;
 insert into public.finance_payments(id,workspace_id,entry_id,amount_cents,paid_on,notes,created_by)
 values(pid,target,entry.id,amount,paid_date,coalesce(payload->>'notes',''),auth.uid());
 update public.finance_entries set version=version+1,updated_at=now() where id=entry.id;
 insert into public.finance_history(workspace_id,entry_id,actor_id,event,details)
 values(target,entry.id,auth.uid(),'payment.created',jsonb_build_object('id',pid,'amountCents',amount,'paidOn',paid_date));
 return pid;
end $$;

create function private.finance_reverse_payment(target uuid,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare entry public.finance_entries; payment public.finance_payments; reason text:=trim(payload->>'reason');
begin
 perform private.finance_guard(target,'reverse');
 select * into entry from public.finance_entries where workspace_id=target and id=(payload->>'entryId')::uuid for update;
 if not found then raise exception 'Entry unavailable' using errcode='23514'; end if;
 select * into payment from public.finance_payments where workspace_id=target and entry_id=entry.id and id=(payload->>'id')::uuid for update;
 if not found then raise exception 'Payment unavailable' using errcode='23514'; end if;
 if payment.reversed_at is not null then raise exception 'Payment already reversed' using errcode='23514'; end if;
 if entry.version is distinct from (payload->>'version')::integer then raise exception 'Concurrent edit' using errcode='40001'; end if;
 if reason is null or length(reason) not between 3 and 500 then raise exception 'Reason required' using errcode='23514'; end if;
 update public.finance_payments set reversed_at=now(),reversed_by=auth.uid(),reverse_reason=reason where id=payment.id;
 update public.finance_entries set version=version+1,updated_at=now() where id=entry.id;
 insert into public.finance_history(workspace_id,entry_id,actor_id,event,details)
 values(target,entry.id,auth.uid(),'payment.reversed',jsonb_build_object('id',payment.id,'amountCents',payment.amount_cents,'reason',reason));
end $$;
create function private.finance_cancel_entry(target uuid,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare entry public.finance_entries; reason text:=trim(payload->>'reason');
begin
 perform private.finance_guard(target,'delete');
 select * into entry from public.finance_entries where workspace_id=target and id=(payload->>'id')::uuid for update;
 if not found then raise exception 'Entry unavailable' using errcode='23514'; end if;
 if entry.version is distinct from (payload->>'version')::integer then raise exception 'Concurrent edit' using errcode='40001'; end if;
 if entry.cancelled_at is not null then raise exception 'Entry cancelled' using errcode='23514'; end if;
 if exists(select 1 from public.finance_payments where workspace_id=target and entry_id=entry.id and reversed_at is null) then raise exception 'Reverse payments before cancellation' using errcode='23514'; end if;
 if reason is null or length(reason) not between 3 and 500 then raise exception 'Reason required' using errcode='23514'; end if;
 update public.finance_entries set cancelled_at=now(),cancel_reason=reason,version=version+1,updated_at=now() where id=entry.id;
 insert into public.finance_history(workspace_id,entry_id,actor_id,event,details) values(target,entry.id,auth.uid(),'entry.cancelled',jsonb_build_object('reason',reason));
end $$;

-- JSON projection for list/detail. Never grant execution on this unguarded internal helper.
create function private.finance_entry_json(e public.finance_entries) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',e.id,'type',e.kind,'companyId',e.company_id,'companyName',c.name,
 'categoryId',e.category_id,'categoryName',cat.name,'description',e.description,'dueDate',e.due_date,
 'amountCents',e.amount_cents,'paidCents',coalesce((select sum(p.amount_cents) from public.finance_payments p where p.workspace_id=e.workspace_id and p.entry_id=e.id and p.reversed_at is null),0),
 'hasPayments',exists(select 1 from public.finance_payments p where p.workspace_id=e.workspace_id and p.entry_id=e.id),
 'notes',e.notes,'cancelledAt',e.cancelled_at,'cancelReason',e.cancel_reason,'version',e.version)
 from public.companies c,public.finance_categories cat
 where c.workspace_id=e.workspace_id and c.id=e.company_id and cat.workspace_id=e.workspace_id and cat.id=e.category_id
$$;
revoke all on function private.finance_entry_json(public.finance_entries) from public,anon,authenticated;

create function private.finance_snapshot(target uuid,filters jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare month_start date; month_end date; year_start date; result jsonb; page_number integer:=coalesce((filters->>'page')::integer,1);
 today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 perform private.finance_guard(target,'read');
 if coalesce(filters->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid period' using errcode='23514'; end if;
 month_start:=((filters->>'month')||'-01')::date;
 if month_start<date '1900-01-01' or month_start>date '2100-12-01' or page_number not between 1 and 1000000 then raise exception 'Invalid period or page' using errcode='23514'; end if;
 month_end:=(month_start+interval '1 month')::date; year_start:=date_trunc('year',month_start)::date;
 with paid as (
  select p.entry_id,sum(p.amount_cents) amount from public.finance_payments p where p.workspace_id=target and p.reversed_at is null group by p.entry_id
 ), period as (
  select e.*,coalesce(p.amount,0) paid, c.name company_name,cat.name category_name
  from public.finance_entries e left join paid p on p.entry_id=e.id
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  where e.workspace_id=target and e.due_date>=month_start and e.due_date<month_end
 ), filtered as (
  select * from period e where (coalesce(filters->>'type','all')='all' or e.kind=filters->>'type')
  and (case coalesce(filters->>'status','all')
   when 'all' then e.cancelled_at is null
   when 'cancelled' then e.cancelled_at is not null
   when 'open' then e.cancelled_at is null and e.paid<e.amount_cents
   when 'overdue' then e.cancelled_at is null and e.paid<e.amount_cents and e.due_date<today
   when 'partial' then e.cancelled_at is null and e.paid>0 and e.paid<e.amount_cents
   when 'settled' then e.cancelled_at is null and e.paid=e.amount_cents else false end)
  and position(lower(left(coalesce(filters->>'query',''),150)) in lower(e.description||' '||e.company_name||' '||e.category_name))>0
 ), cash as (
  select p.*,e.kind from public.finance_payments p join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  where p.workspace_id=target and p.reversed_at is null and p.paid_on>=year_start and p.paid_on<(year_start+interval '1 year')::date
 )
 select jsonb_build_object(
 'workspace',target,'today',today,'month',to_char(month_start,'YYYY-MM'),'page',page_number,'count',(select count(*) from filtered),
 'entries',coalesce((select jsonb_agg(private.finance_entry_json(e) order by e.due_date,e.id) from public.finance_entries e
  where e.workspace_id=target and e.id in (select id from filtered order by due_date,id limit 30 offset (page_number-1)*30)),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'active',active,'version',version) order by kind,name,id) from public.finance_categories where workspace_id=target),'[]'::jsonb),
 'permissions',jsonb_build_object('create',private.module_access(target,'financeiro','create'),'update',private.module_access(target,'financeiro','update'),'cancel',private.module_access(target,'financeiro','delete'),'settle',private.module_access(target,'financeiro','settle'),'reverse',private.module_access(target,'financeiro','reverse'),'categories',private.workspace_role(target) in ('owner','admin')),
 'totals',jsonb_build_object(
  'receivable',coalesce((select sum(amount_cents-paid) from period where kind='receivable' and cancelled_at is null),0),
  'payable',coalesce((select sum(amount_cents-paid) from period where kind='payable' and cancelled_at is null),0),
  'received',coalesce((select sum(amount_cents) from cash where kind='receivable' and paid_on>=month_start and paid_on<month_end),0),
  'paid',coalesce((select sum(amount_cents) from cash where kind='payable' and paid_on>=month_start and paid_on<month_end),0)),
 'monthly', (select jsonb_agg(jsonb_build_object('month',n,'value',coalesce((select sum(case when kind='receivable' then amount_cents else -amount_cents end) from cash where extract(month from paid_on)=n),0)) order by n) from generate_series(1,12) n),
 'expenses',coalesce((select jsonb_agg(x order by x.value desc,x.name) from
  (select category_id as id,category_name as name,sum(amount_cents) as value from period where kind='payable' and cancelled_at is null group by category_id,category_name) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function private.finance_entry_detail(target uuid,entry uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.finance_guard(target,'read');
 select private.finance_entry_json(e) into result from public.finance_entries e where workspace_id=target and id=entry;
 if result is null then raise exception 'Entry unavailable' using errcode='23514'; end if;
 return jsonb_build_object('entry',result,
 'payments',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'amountCents',p.amount_cents,'paidOn',p.paid_on,'notes',p.notes,'reversedAt',p.reversed_at,'reverseReason',p.reverse_reason,'actor',coalesce(pr.full_name,'Usuário removido')) order by p.created_at desc,p.id)
 from public.finance_payments p left join public.profiles pr on pr.id=p.created_by where p.workspace_id=target and p.entry_id=entry),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(x order by x."createdAt" desc,x.id) from (select h.id,h.event,h.details,h.created_at as "createdAt",coalesce(pr.full_name,'Usuário removido') as actor
 from public.finance_history h left join public.profiles pr on pr.id=h.actor_id where h.workspace_id=target and h.entry_id=entry order by h.created_at desc,h.id limit 100) x),'[]'::jsonb));
end $$;

-- Explicit authenticated RPC wrappers. Implementation functions remain in private.
create function public.finance_snapshot(target uuid,filters jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.finance_snapshot(target,filters) $$;
create function public.finance_search_companies(target uuid,query text) returns jsonb language sql security invoker set search_path='' as $$ select private.finance_search_companies(target,query) $$;
create function public.finance_entry_detail(target uuid,entry uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.finance_entry_detail(target,entry) $$;
create function public.finance_save_category(target uuid,payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.finance_save_category(target,payload) $$;
create function public.finance_save_entry(target uuid,payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.finance_save_entry(target,payload) $$;
create function public.finance_settle(target uuid,payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.finance_settle(target,payload) $$;
create function public.finance_reverse_payment(target uuid,payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.finance_reverse_payment(target,payload) $$;
create function public.finance_cancel_entry(target uuid,payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.finance_cancel_entry(target,payload) $$;
do $$ declare f record; begin
 for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')
  and p.proname in ('finance_snapshot','finance_search_companies','finance_entry_detail','finance_save_category','finance_save_entry','finance_settle','finance_reverse_payment','finance_cancel_entry')
 loop
  execute format('revoke all on function %I.%I(%s) from public,anon,authenticated',f.nspname,f.proname,f.args);
  execute format('grant execute on function %I.%I(%s) to authenticated',f.nspname,f.proname,f.args);
 end loop;
end $$;
-- Realtime never publishes unscoped financial data to anonymous clients: RLS SELECT is enforced.
do $$ declare t text; begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then raise exception 'Publication supabase_realtime is missing'; end if;
 foreach t in array array['finance_entries','finance_categories'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
commit;
