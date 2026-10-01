-- Prospection is paused, not removed. Keep its tables and relationships for a future reactivation.
-- The product catalog no longer exposes this module, and workspace_modules is the
-- authoritative database gate for tenant access.
begin;

update public.workspace_modules
set enabled = false
where module = 'prospeccao';

commit;
