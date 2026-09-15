create table public.deal_notes (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 deal_id uuid not null,
 body text not null check(length(trim(body)) between 1 and 20000),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1,
 unique(workspace_id,deal_id,id),
 foreign key(workspace_id,deal_id) references public.deals(workspace_id,id) on delete cascade
);
create table public.deal_files (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 deal_id uuid not null,
 note_id uuid,
 original_name text not null check(length(original_name) between 1 and 240),
 storage_path text not null unique,
 content_type text not null check(content_type in ('application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 status text not null default 'pending' check(status in ('pending','ready')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1,
 foreign key(workspace_id,deal_id) references public.deals(workspace_id,id) on delete restrict,
 foreign key(workspace_id,deal_id,note_id) references public.deal_notes(workspace_id,deal_id,id) on delete restrict,
 check(storage_path=workspace_id::text||'/'||deal_id::text||'/'||id::text)
);
create index notes_workspace_deal_idx on public.deal_notes(workspace_id,deal_id,created_at desc,id);
create index notes_author_idx on public.deal_notes(created_by);
create index files_workspace_deal_idx on public.deal_files(workspace_id,deal_id,created_at desc,id);
create index files_note_idx on public.deal_files(workspace_id,deal_id,note_id);
create index files_author_idx on public.deal_files(created_by);
alter table public.deal_activities add column version integer not null default 1;

create function private.prepare_deal_child() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.created_by=auth.uid(); new.created_at=now(); new.version=1;
 else
  if new.workspace_id is distinct from old.workspace_id or new.deal_id is distinct from old.deal_id or new.id is distinct from old.id then
   raise exception 'Child cannot change workspace or deal' using errcode='23514';
  end if;
  new.created_by=old.created_by; new.created_at=old.created_at; new.version=old.version+1;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.prepare_deal_child() from public,anon,authenticated;
create trigger prepare_deal_child before insert or update on public.deal_notes for each row execute function private.prepare_deal_child();
create trigger prepare_deal_child before insert or update on public.deal_files for each row execute function private.prepare_deal_child();
create trigger version_deal_activity before insert or update on public.deal_activities for each row execute function private.prepare_deal_child();

alter table public.deal_notes enable row level security;
alter table public.deal_files enable row level security;
revoke all on public.deal_notes,public.deal_files from public,anon,authenticated;
grant select,delete on public.deal_notes,public.deal_files to authenticated;
grant insert(workspace_id,deal_id,body) on public.deal_notes to authenticated;
grant update(body) on public.deal_notes to authenticated;
grant insert(id,workspace_id,deal_id,note_id,original_name,storage_path,content_type,size_bytes) on public.deal_files to authenticated;
grant update(status) on public.deal_files to authenticated;
do $$
declare t text;
begin
 foreach t in array array['deal_notes','deal_files'] loop
  execute format('create policy tenant_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_create on public.%I for insert to authenticated with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_edit on public.%I for update to authenticated using(private.workspace_role(workspace_id) is not null) with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy author_or_admin_remove on public.%I for delete to authenticated using(private.workspace_role(workspace_id) is not null and (created_by=(select auth.uid()) or private.workspace_role(workspace_id) in (''owner'',''admin'')))',t);
 end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('crm-files','crm-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
create policy crm_files_read on storage.objects for select to authenticated using(
 bucket_id='crm-files' and exists(select 1 from public.deal_files f where f.storage_path=name and private.workspace_role(f.workspace_id) is not null)
);
create policy crm_files_upload on storage.objects for insert to authenticated with check(
 bucket_id='crm-files' and exists(select 1 from public.deal_files f where f.storage_path=name and f.status='pending' and f.created_by=(select auth.uid()) and private.workspace_role(f.workspace_id) is not null)
);
create policy crm_files_remove on storage.objects for delete to authenticated using(
 bucket_id='crm-files' and exists(select 1 from public.deal_files f where f.storage_path=name and private.workspace_role(f.workspace_id) is not null and (f.created_by=(select auth.uid()) or private.workspace_role(f.workspace_id) in ('owner','admin')))
);

create function private.check_ready_file() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='ready' and not exists(
  select 1 from storage.objects o where o.bucket_id='crm-files' and o.name=new.storage_path
   and (o.metadata->>'size')::bigint=new.size_bytes
 ) then raise exception 'Upload not complete or size mismatch' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.check_ready_file() from public,anon,authenticated;
create trigger check_ready_file before update on public.deal_files for each row execute function private.check_ready_file();
