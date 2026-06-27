-- Extensions & enums (Phase 1).
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_cron";    -- scheduled jobs (development.md §9.3)

-- Roles (development.md §4)
do $$ begin
  create type user_role as enum ('guest','customer','courier','operator','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_t as enum ('male','female','unisex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type concentration_t as enum ('EDP','EDT','Parfum','EDC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scent_family_t as enum ('floral','woody','fresh','oriental','citrus','spicy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status_t as enum ('pending','confirmed','shipping','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method_t as enum ('qpay','bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status_t as enum ('unpaid','paid','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tag_kind_t as enum ('new','hot','sale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coupon_type_t as enum ('percent','fixed');
exception when duplicate_object then null; end $$;

-- Reusable updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
