create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  ) or exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = auth.uid()
  );
$$;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspaces_select_member"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

create policy "workspaces_insert_owner"
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

create policy "workspaces_update_owner"
on public.workspaces for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "workspace_members_select_member"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner_or_admin"
on public.workspace_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces
    where id = workspace_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.workspace_members
    where workspace_id = workspace_members.workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);

create policy "prospects_select_member"
on public.prospects for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "prospects_insert_member"
on public.prospects for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "prospects_update_member"
on public.prospects for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "prospects_delete_member"
on public.prospects for delete
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "prospect_contacts_access_member"
on public.prospect_contacts for all
to authenticated
using (
  exists (
    select 1
    from public.prospects
    where id = prospect_id
      and public.is_workspace_member(workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.prospects
    where id = prospect_id
      and public.is_workspace_member(workspace_id)
  )
);

create policy "prospect_score_axes_access_member"
on public.prospect_score_axes for all
to authenticated
using (
  exists (
    select 1
    from public.prospects
    where id = prospect_id
      and public.is_workspace_member(workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.prospects
    where id = prospect_id
      and public.is_workspace_member(workspace_id)
  )
);

create policy "prospect_favorites_select_own"
on public.prospect_favorites for select
to authenticated
using (user_id = auth.uid());

create policy "prospect_favorites_insert_own"
on public.prospect_favorites for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.prospects
    where id = prospect_id
      and public.is_workspace_member(workspace_id)
  )
);

create policy "prospect_favorites_delete_own"
on public.prospect_favorites for delete
to authenticated
using (user_id = auth.uid());
