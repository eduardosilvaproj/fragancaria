-- Migration: add weight_source to products
alter table public.products
  add column if not exists weight_source text check (weight_source in ('estimado', 'medido'));
