create table public.services (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 description text not null default '',
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,id)
);
alter table public.contacts add constraint contacts_workspace_id_unique unique(workspace_id,id);
alter table public.contacts add constraint contacts_company_id_unique unique(workspace_id,company_id,id);

alter table public.deals drop constraint deals_stage_check;
alter table public.deals add column status text not null default 'open';
update public.deals set status='won',closed_at=coalesce(closed_at,updated_at) where stage='fechado';
update public.deals set stage=case stage when 'novo' then 'new' when 'contatado' then 'contacted'
 when 'reuniao_marcada' then 'diagnosis' when 'fechado' then 'negotiation' else stage end;
alter table public.deals alter column stage set default 'new';
alter table public.deals add constraint deals_stage_check check(stage in ('new','contacted','diagnosis','proposal','negotiation'));
alter table public.deals add constraint deals_status_check check(status in ('open','won','lost'));
alter table public.deals add column contact_id uuid;
alter table public.deals add column service_id uuid;
alter table public.deals add column owner_id uuid;
alter table public.deals add column expected_close_date date;
alter table public.deals add column stage_entered_at timestamptz not null default now();
alter table public.deals add column summary text not null default '';
alter table public.deals add column score smallint not null default 0 check(score between 0 and 100);
alter table public.deals add column lost_reason text;
alter table public.deals add column version integer not null default 1;
alter table public.deals add constraint deals_lost_reason_check check(status<>'lost' or length(trim(coalesce(lost_reason,'')))>0);
alter table public.deals add constraint deals_contact_requires_company check(contact_id is null or company_id is not null);
alter table public.deals add constraint deals_contact_tenant_fk foreign key(workspace_id,company_id,contact_id)
 references public.contacts(workspace_id,company_id,id) on delete restrict;
alter table public.deals add constraint deals_service_tenant_fk foreign key(workspace_id,service_id)
 references public.services(workspace_id,id) on delete restrict;
-- Owners also have a membership record so assignments can use a composite FK.
insert into public.workspace_members(workspace_id,user_id,role)
 select id,owner_id,'owner' from public.workspaces
 on conflict(workspace_id,user_id) do update set role='owner';
alter table public.deals add constraint deals_owner_tenant_fk foreign key(workspace_id,owner_id)
 references public.workspace_members(workspace_id,user_id) on delete restrict;

create function private.add_workspace_owner() returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if new.owner_id is distinct from auth.uid() then
  raise exception 'Workspace owner must be the current user' using errcode='42501';
 end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(new.id,new.owner_id,'owner');
 return new;
end $$;
revoke all on function private.add_workspace_owner() from public,anon,authenticated;
create trigger add_workspace_owner after insert on public.workspaces for each row execute function private.add_workspace_owner();

create table public.deal_activities (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 deal_id uuid not null,
 type text not null check(type in ('call','whatsapp','email','meeting','follow_up','proposal','task','note')),
 title text not null check(length(trim(title)) between 1 and 300),
 description text not null default '',
 scheduled_at timestamptz,
 completed_at timestamptz,
 status text not null default 'pending' check(status in ('pending','completed')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id,deal_id) references public.deals(workspace_id,id) on delete cascade
);
create table public.deal_history (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 deal_id uuid not null,
 actor_id uuid references public.profiles(id) on delete set null,
 event text not null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now(),
 foreign key(workspace_id,deal_id) references public.deals(workspace_id,id) on delete cascade
);
create index services_workspace_name_idx on public.services(workspace_id,name);
create index deals_workspace_status_stage_idx on public.deals(workspace_id,status,stage,updated_at desc,id);
create index deals_workspace_owner_idx on public.deals(workspace_id,owner_id);
create index deals_workspace_service_idx on public.deals(workspace_id,service_id);
create index deals_workspace_contact_idx on public.deals(workspace_id,company_id,contact_id);
create index deals_workspace_closing_idx on public.deals(workspace_id,expected_close_date,id) where status='open';
create index activities_workspace_deal_idx on public.deal_activities(workspace_id,deal_id,created_at desc);
create index activities_pending_idx on public.deal_activities(workspace_id,scheduled_at,id) where status='pending';
create index activities_creator_idx on public.deal_activities(created_by);
create index history_workspace_deal_idx on public.deal_history(workspace_id,deal_id,created_at desc,id);
create index history_actor_idx on public.deal_history(actor_id);

do $$
declare t text;
begin
 foreach t in array array['services','deal_activities'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create trigger prevent_tenant_move before update on public.%I for each row execute function private.prevent_tenant_move()',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_create on public.%I for insert to authenticated with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_edit on public.%I for update to authenticated using(private.workspace_role(workspace_id) is not null) with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_remove on public.%I for delete to authenticated using(private.workspace_role(workspace_id) in (''owner'',''admin''))',t);
 end loop;
end $$;
alter table public.deal_history enable row level security;
revoke all on public.deal_history from anon,authenticated;
grant select on public.deal_history to authenticated;
create policy history_read on public.deal_history for select to authenticated using(private.workspace_role(workspace_id) is not null);

create function private.prepare_deal() returns trigger language plpgsql set search_path=''
as $$ begin
 if tg_op='UPDATE' then
  new.version=old.version+1;
  if new.stage is distinct from old.stage then new.stage_entered_at=now();
  else new.stage_entered_at=old.stage_entered_at; end if;
 else new.version=1; new.stage_entered_at=now(); end if;
 if new.status='open' then new.closed_at=null; new.lost_reason=null;
 elsif tg_op='INSERT' then new.closed_at=now();
 elsif new.status is distinct from old.status then new.closed_at=now();
 else new.closed_at=old.closed_at; end if;
 if new.status<>'lost' then new.lost_reason=null; end if;
 return new;
end $$;
revoke all on function private.prepare_deal() from public,anon,authenticated;
create trigger prepare_deal before insert or update on public.deals for each row execute function private.prepare_deal();

create function private.audit_deal() returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null or private.workspace_role(new.workspace_id) is null then
  raise exception 'Authenticated workspace member required' using errcode='42501';
 end if;
 insert into public.deal_history(workspace_id,deal_id,actor_id,event,before_data,after_data)
 values(new.workspace_id,new.id,auth.uid(),lower(tg_op),
 case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private.audit_deal() from public,anon,authenticated;
create trigger audit_deal after insert or update on public.deals for each row execute function private.audit_deal();

create function private.prepare_activity() returns trigger language plpgsql set search_path=''
as $$ begin
 if tg_op='INSERT' then new.created_by=auth.uid();
 else
  new.created_by=old.created_by; new.created_at=old.created_at;
  if new.deal_id is distinct from old.deal_id then raise exception 'Activity cannot change deal' using errcode='23514'; end if;
 end if;
 if new.status='pending' then new.completed_at=null;
 elsif tg_op='INSERT' then new.completed_at=now();
 elsif old.status='pending' then new.completed_at=now();
 else new.completed_at=old.completed_at; end if;
 return new;
end $$;
revoke all on function private.prepare_activity() from public,anon,authenticated;
create trigger prepare_activity before insert or update on public.deal_activities for each row execute function private.prepare_activity();

-- Indexed textual search; tenant filtering must accompany the query and RLS still applies.
alter table public.companies add column search_vector tsvector generated always as
 (to_tsvector('portuguese'::regconfig,coalesce(name,'')||' '||coalesce(legal_name,'')||' '||coalesce(document_number,''))) stored;
create index companies_search_idx on public.companies using gin(search_vector);
alter table public.deals add column search_vector tsvector generated always as
 (to_tsvector('portuguese'::regconfig,coalesce(name,'')||' '||coalesce(summary,''))) stored;
create index deals_search_idx on public.deals using gin(search_vector);
