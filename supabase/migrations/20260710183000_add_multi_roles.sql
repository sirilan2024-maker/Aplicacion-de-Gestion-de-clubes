-- supabase/migrations/20260710183000_add_multi_roles.sql

-- Add roles column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Initialize roles column with the current role value for existing profiles
UPDATE public.profiles SET roles = ARRAY[role] WHERE roles = '{}' OR roles IS NULL;
