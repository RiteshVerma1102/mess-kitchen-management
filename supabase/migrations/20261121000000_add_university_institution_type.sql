-- Add 'university' to institution_type enum if not exists
ALTER TYPE public.institution_type ADD VALUE IF NOT EXISTS 'university';
