-- Seasonal tag for products (requirement: Улиралын таг).
do $$ begin
  create type season_t as enum ('spring','summer','autumn','winter','all');
exception when duplicate_object then null; end $$;

alter table products add column if not exists season season_t;
create index if not exists products_season_idx on products (season);
