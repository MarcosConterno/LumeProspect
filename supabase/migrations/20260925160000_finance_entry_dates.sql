-- Datas explícitas do lançamento e da última baixa do título.
-- Execute depois de 20260925153000_finance_list_page_size.sql.
begin;

alter table public.finance_entries
  add column if not exists launch_date date;

update public.finance_entries
set launch_date=(created_at at time zone 'America/Sao_Paulo')::date
where launch_date is null;

alter table public.finance_entries
  alter column launch_date set default ((now() at time zone 'America/Sao_Paulo')::date),
  alter column launch_date set not null;

do $$ begin
  alter table public.finance_entries
    add constraint finance_entries_launch_date_check
    check(launch_date between date '1900-01-01' and date '2100-12-31');
exception when duplicate_object then null;
end $$;

create index if not exists finance_entries_launch_idx on public.finance_entries(workspace_id,launch_date,id);

create or replace function private.finance_entry_json(e public.finance_entries) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',e.id,'type',e.kind,'companyId',e.company_id,'companyName',c.name,
 'categoryId',e.category_id,'categoryName',cat.name,'description',e.description,'launchDate',e.launch_date,'dueDate',e.due_date,
 'settlementDate',(select max(p.paid_on) from public.finance_payments p where p.workspace_id=e.workspace_id and p.entry_id=e.id and p.reversed_at is null),
 'amountCents',e.amount_cents,'paidCents',coalesce((select sum(p.amount_cents) from public.finance_payments p where p.workspace_id=e.workspace_id and p.entry_id=e.id and p.reversed_at is null),0),
 'hasPayments',exists(select 1 from public.finance_payments p where p.workspace_id=e.workspace_id and p.entry_id=e.id),
 'notes',e.notes,'cancelledAt',e.cancelled_at,'cancelReason',e.cancel_reason,'version',e.version)
 from public.companies c,public.finance_categories cat
 where c.workspace_id=e.workspace_id and c.id=e.company_id and cat.workspace_id=e.workspace_id and cat.id=e.category_id
$$;

create or replace function private.finance_save_entry(target uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
   kind=payload->>'type',description=trim(payload->>'description'),launch_date=(payload->>'launchDate')::date,due_date=(payload->>'dueDate')::date,
   amount_cents=(payload->>'amountCents')::bigint,notes=coalesce(payload->>'notes',''),updated_at=now(),version=version+1
   where workspace_id=target and id=eid;
 else
  insert into public.finance_entries(id,workspace_id,company_id,category_id,kind,description,launch_date,due_date,amount_cents,notes,created_by)
  values(eid,target,(payload->>'companyId')::uuid,(payload->>'categoryId')::uuid,payload->>'type',
   trim(payload->>'description'),(payload->>'launchDate')::date,(payload->>'dueDate')::date,(payload->>'amountCents')::bigint,coalesce(payload->>'notes',''),auth.uid());
 end if;
 insert into public.finance_history(workspace_id,entry_id,actor_id,event,details) values(target,eid,auth.uid(),case when is_update then 'entry.updated' else 'entry.created' end,
  jsonb_build_object('before',to_jsonb(old_row),'after',(select to_jsonb(e) from public.finance_entries e where id=eid)));
 return eid;
end $$;

-- Enrich the existing search RPC without duplicating its filtering rules.
alter function private.finance_search_entries(uuid,jsonb,boolean) rename to finance_search_entries_legacy;

create or replace function private.finance_search_entries(target uuid, filters jsonb, export_all boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.finance_search_entries_legacy(target,filters,export_all);
 return jsonb_set(result,'{entries}',coalesce((
   select jsonb_agg(private.finance_entry_json(e) order by entry_rows.ordinality)
   from jsonb_array_elements(coalesce(result->'entries','[]'::jsonb)) with ordinality as entry_rows
   join public.finance_entries e on e.workspace_id=target and e.id=(entry_rows.value->>'id')::uuid
 ),'[]'::jsonb),true);
end $$;

create or replace function public.finance_search_entries(target uuid, filters jsonb, export_all boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select private.finance_search_entries(target,filters,export_all)
$$;

revoke all on function private.finance_search_entries_legacy(uuid,jsonb,boolean),private.finance_search_entries(uuid,jsonb,boolean),public.finance_search_entries(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function private.finance_search_entries(uuid,jsonb,boolean),public.finance_search_entries(uuid,jsonb,boolean) to authenticated;

commit;
