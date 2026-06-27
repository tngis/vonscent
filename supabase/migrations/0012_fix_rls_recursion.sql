-- Fix RLS infinite recursion (error 54001 "stack depth limit exceeded").
--
-- products."products read" calls is_staff() -> current_role_name() which reads
-- `profiles`; the profiles RLS policies themselves call is_staff(), recursing
-- forever. Marking these helpers SECURITY DEFINER makes the inner profiles read
-- run as the function owner, bypassing RLS and breaking the cycle. This is the
-- standard Supabase pattern for role-check helpers.

create or replace function current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid()),
    'guest'::user_role
  );
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_role_name() in ('operator','super_admin');
$$;
