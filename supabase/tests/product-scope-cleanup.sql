-- Read-only inventory before pausing the prospection module.
-- Run this in Supabase and keep the result with the deployment record.

select 'prospects' as relation_name, count(*) as total
from public.prospects
union all
select 'prospect_contacts', count(*)
from public.prospect_contacts
union all
select 'prospect_score_axes', count(*)
from public.prospect_score_axes
union all
select 'prospect_favorites', count(*)
from public.prospect_favorites
union all
select 'deals_with_prospect', count(*)
from public.deals
where prospect_id is not null;

select workspace_id, module, enabled
from public.workspace_modules
where module = 'prospeccao'
order by workspace_id;
