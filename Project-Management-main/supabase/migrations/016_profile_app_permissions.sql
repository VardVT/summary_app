-- Per-user app permission matrix (edit | view | ban) and permission delegation flag
alter table public.profiles
  add column if not exists app_permissions jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists can_manage_app_permissions boolean;

comment on column public.profiles.app_permissions is
  'Per-app access overrides keyed by appId: "edit" | "view" | "ban".';

comment on column public.profiles.can_manage_app_permissions is
  'Explicit delegation allowing this user to edit other users app access permissions in APP-09.';
