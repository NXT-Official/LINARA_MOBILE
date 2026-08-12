-- Story 3: household-evidence storage bucket + Row-Level Security policies.
--
-- This mirrors the household_id isolation pattern already applied to the
-- public.* tables in ../LINARA/ARCHITECTURE.md (Section 8) and is applied
-- the same way the rest of the shared schema is: paste into the Supabase
-- SQL editor for the shared project. No public schema tables are touched.

-- 1. Create the private bucket if it does not already exist. Matches the
--    evidence/receipt/voice-memo constraints in ../LINARA/ARCHITECTURE.md 5.1
--    (private bucket, 10MB cap, JPEG/PNG/WEBM only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'household-evidence',
  'household-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'audio/webm']
)
on conflict (id) do nothing;

-- 2. Object paths must be written under a "<household_id>/..." prefix, e.g.
--    "<household_id>/tickets/<ticket_id>.jpg" or
--    "<household_id>/receipts/<grocery_item_id>.jpg". This lets the policy
--    below isolate access with a single indexed lookup instead of joining
--    against every possible source table per read.

-- 3. storage.objects has Row-Level Security enabled by default on every
--    Supabase project. Restrict all operations on this bucket to session
--    profiles whose household_id matches the object's leading path segment.
--
--    Uses public.current_household_id() rather than re-deriving household_id
--    with a raw subquery here. That function is defined in
--    ../LINARA/supabase/fix-household-rls-recursion.sql — run that script
--    FIRST (or already have) before (re-)running this one, or this policy
--    will fail with "function public.current_household_id() does not
--    exist." A raw subquery against public.user_profiles was tried here
--    originally and hit Postgres error 42P17 (infinite recursion) once it
--    triggered user_profiles' own (at the time self-referencing) policy —
--    see that script's header comment for the full root cause.
drop policy if exists household_evidence_isolation on storage.objects;
create policy household_evidence_isolation
  on storage.objects
  for all
  using (
    bucket_id = 'household-evidence'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  )
  with check (
    bucket_id = 'household-evidence'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );
