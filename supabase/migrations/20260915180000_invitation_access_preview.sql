-- NOVA, PENDENTE. Consulta de convite para o próprio destinatário.
-- Não altera papéis, contas ou permissões existentes.
begin;
create function private.preview_workspace_invite(token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare invitation public.workspace_invites; actor uuid:=auth.uid(); address text; home public.workspaces;
begin
 if actor is null or token is null or token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('status','unavailable'); end if;
 select lower(email) into address from auth.users where id=actor and email_confirmed_at is not null;
 select * into invitation from public.workspace_invites
 where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and email=address;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into home from public.workspaces where id=invitation.workspace_id;
 if not found or home.status<>'active' or invitation.revoked_at is not null then return jsonb_build_object('status','unavailable'); end if;
 if invitation.accepted_at is not null then return jsonb_build_object('status','accepted','role',invitation.role,'company',home.name); end if;
 if invitation.expires_at<=now() then return jsonb_build_object('status','expired'); end if;
 if exists(select 1 from public.workspace_members where user_id=actor and workspace_id<>home.id) then return jsonb_build_object('status','other_company'); end if;
 if invitation.role='master' and not exists(select 1 from private.platform_admins where user_id=invitation.created_by) then return jsonb_build_object('status','unavailable'); end if;
 return jsonb_build_object('status','pending','role',invitation.role,'company',home.name);
end $$;
create function public.preview_workspace_invite(token text) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.preview_workspace_invite(token) $$;
revoke all on function private.preview_workspace_invite(text),public.preview_workspace_invite(text) from public,anon,authenticated;
grant execute on function private.preview_workspace_invite(text),public.preview_workspace_invite(text) to authenticated;
commit;
