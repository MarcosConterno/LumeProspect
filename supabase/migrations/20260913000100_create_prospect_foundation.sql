create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  legal_name text,
  document_number text,
  segment text,
  location text,
  employee_range text,
  revenue_range text,
  potential text not null default 'medio' check (potential in ('alto', 'medio', 'baixo')),
  score smallint check (score between 0 and 100),
  insight text,
  pain_point text,
  recommended_service text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  website text,
  linkedin_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_score_axes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  name text not null,
  value smallint not null check (value between 0 and 100),
  created_at timestamptz not null default now(),
  unique (prospect_id, name)
);

create table public.prospect_favorites (
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prospect_id, user_id)
);

create index prospects_workspace_id_idx on public.prospects(workspace_id);
create index prospects_score_idx on public.prospects(workspace_id, score desc nulls last);
create index prospects_segment_idx on public.prospects(workspace_id, segment);
create index prospect_contacts_prospect_id_idx on public.prospect_contacts(prospect_id);
create index prospect_score_axes_prospect_id_idx on public.prospect_score_axes(prospect_id);
create index prospect_favorites_user_id_idx on public.prospect_favorites(user_id);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_contacts enable row level security;
alter table public.prospect_score_axes enable row level security;
alter table public.prospect_favorites enable row level security;
