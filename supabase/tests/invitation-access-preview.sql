-- Executar depois de 20260915180000_invitation_access_preview.sql.
-- Fixtures temporárias. O ROLLBACK desfaz inclusive o acesso master de teste.
begin;
do $$ declare root uuid; home uuid; person uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); begin
 select user_id into strict root from private.platform_admins limit 1;
 select id into strict home from public.workspaces where is_lume;
 insert into auth.users(id,email,email_confirmed_at) values
 (person,'invite-'||person||'@example.invalid',now()),
 (stranger,'invite-'||stranger||'@example.invalid',now());
 insert into public.profiles(id,full_name) values(person,'Teste convite'),(stranger,'Teste isolamento') on conflict do nothing;
 perform set_config('test.root',root::text,true);
 perform set_config('test.home',home::text,true);
 perform set_config('test.person',person::text,true);
 perform set_config('test.stranger',stranger::text,true);
 perform set_config('test.token',md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.root'),true);
select public.platform_manage('invite_master',current_setting('test.home')::uuid,
 jsonb_build_object('email','invite-'||current_setting('test.person')||'@example.invalid','token',current_setting('test.token')));
select set_config('request.jwt.claim.sub',current_setting('test.stranger'),true);
do $$ begin
 if public.preview_workspace_invite(current_setting('test.token'))<>jsonb_build_object('status','unavailable') then raise exception 'Invite leaked to another account'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.person'),true);
do $$ declare result jsonb; begin
 result:=public.preview_workspace_invite(current_setting('test.token'));
 if result->>'status'<>'pending' or result->>'role'<>'master' then raise exception 'Master preview incorrect'; end if;
 if public.is_lume_master() then raise exception 'Preview granted access'; end if;
 if public.preview_workspace_invite('invalid')->>'status'<>'unavailable' then raise exception 'Invalid token accepted'; end if;
 perform public.accept_workspace_invite(current_setting('test.token'));
 if not public.is_lume_master() then raise exception 'Master acceptance did not grant access'; end if;
 if public.preview_workspace_invite(current_setting('test.token'))->>'status'<>'accepted' then raise exception 'Accepted status missing'; end if;
 if not public.module_access(current_setting('test.home')::uuid,'financeiro','read') then raise exception 'Master lacks module access'; end if;
end $$;
reset role;
update public.workspace_invites set revoked_at=now() where token_hash=encode(sha256(convert_to(current_setting('test.token'),'UTF8')),'hex');
set local role authenticated;
do $$ begin
 if public.preview_workspace_invite(current_setting('test.token'))->>'status'<>'unavailable' then raise exception 'Revoked invite exposed'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.preview_workspace_invite(current_setting('test.token'));
  raise exception 'Anonymous call allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: invitation preview, isolation, master acceptance and module access' as result;
rollback;
