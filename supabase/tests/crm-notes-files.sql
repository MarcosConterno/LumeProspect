begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); wa uuid:=gen_random_uuid(); wb uuid:=gen_random_uuid(); da uuid:=gen_random_uuid(); db uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(a),(b);
 insert into public.profiles(id) values(a),(b);
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.workspaces(id,name,owner_id) values(wa,'CRM audit temporary A',a);
 insert into public.deals(id,workspace_id,name) values(da,wa,'Temporary deal A');
 perform set_config('request.jwt.claim.sub',b::text,true);
 insert into public.workspaces(id,name,owner_id) values(wb,'CRM audit temporary B',b);
 insert into public.deals(id,workspace_id,name) values(db,wb,'Temporary deal B');
 perform set_config('test.a',a::text,true); perform set_config('test.b',b::text,true);
 perform set_config('test.wa',wa::text,true); perform set_config('test.wb',wb::text,true);
 perform set_config('test.da',da::text,true); perform set_config('test.db',db::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$
declare note_id uuid; file_id uuid:=gen_random_uuid(); n integer;
begin
 insert into public.deal_notes(workspace_id,deal_id,body) values(current_setting('test.wa')::uuid,current_setting('test.da')::uuid,'Original') returning id into note_id;
 update public.deal_notes set body='Revised' where id=note_id and version=1;
 if (select version from public.deal_notes where id=note_id)<>2 then raise exception 'FAIL note version'; end if;
 update public.deal_notes set body='Stale' where id=note_id and version=1;
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL conflict filter'; end if;
 if (select created_by from public.deal_notes where id=note_id)<>auth.uid() then raise exception 'FAIL author'; end if;
 begin
  insert into public.deal_notes(workspace_id,deal_id,body) values(current_setting('test.wa')::uuid,current_setting('test.db')::uuid,'Invalid');
  raise exception 'FAIL cross deal FK';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.deal_notes(workspace_id,deal_id,body) values(current_setting('test.wb')::uuid,current_setting('test.db')::uuid,'Invalid');
  raise exception 'FAIL cross tenant insert';
 exception when insufficient_privilege then null; end;
 insert into public.deal_files(id,workspace_id,deal_id,note_id,original_name,storage_path,content_type,size_bytes)
 values(file_id,current_setting('test.wa')::uuid,current_setting('test.da')::uuid,note_id,'audit.txt',current_setting('test.wa')||'/'||current_setting('test.da')||'/'||file_id::text,'text/plain',12);
 begin
  update public.deal_files set status='ready' where id=file_id;
  raise exception 'FAIL ready without object';
 exception when check_violation then null; end;
 begin
  delete from public.deal_notes where id=note_id;
  raise exception 'FAIL deletion with attachment';
 exception when foreign_key_violation then null; end;
 perform set_config('test.note',note_id::text,true); perform set_config('test.file',file_id::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ begin
 if exists(select 1 from public.deal_notes where id=current_setting('test.note')::uuid) then raise exception 'FAIL cross note read'; end if;
 if exists(select 1 from public.deal_files where id=current_setting('test.file')::uuid) then raise exception 'FAIL cross file read'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform 1 from public.deal_notes; raise exception 'FAIL anonymous notes'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.deal_files; raise exception 'FAIL anonymous files'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: notes/file metadata isolation, author, version conflict, FK, pending upload and anonymous denial. All fixtures rolled back.' as result;
rollback;
