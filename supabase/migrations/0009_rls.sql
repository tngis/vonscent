-- Row Level Security (development.md §7.4). Public read for the storefront;
-- writes go through the service role (route handlers) or are owner-scoped.

-- Helper: current user's role.
create or replace function current_role_name()
returns user_role language sql stable as $$
  select coalesce(
    (select role from profiles where id = auth.uid()),
    'guest'::user_role
  );
$$;

create or replace function is_staff()
returns boolean language sql stable as $$
  select current_role_name() in ('operator','super_admin');
$$;

-- ── Public catalog: read-only for everyone, write for staff ────────────
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table tags enable row level security;
alter table product_tags enable row level security;
alter table inventory enable row level security;
alter table settings enable row level security;

create policy "products read" on products for select using (is_active or is_staff());
create policy "products write" on products for all using (is_staff()) with check (is_staff());

create policy "images read" on product_images for select using (true);
create policy "images write" on product_images for all using (is_staff()) with check (is_staff());

create policy "variants read" on product_variants for select using (true);
create policy "variants write" on product_variants for all using (is_staff()) with check (is_staff());

create policy "tags read" on tags for select using (true);
create policy "tags write" on tags for all using (is_staff()) with check (is_staff());

create policy "ptags read" on product_tags for select using (true);
create policy "ptags write" on product_tags for all using (is_staff()) with check (is_staff());

create policy "inventory read" on inventory for select using (true);
create policy "inventory write" on inventory for all using (is_staff()) with check (is_staff());

create policy "settings read" on settings for select using (true);
create policy "settings write" on settings for all using (is_staff()) with check (is_staff());

-- ── Profiles: owner or staff ───────────────────────────────────────────
alter table profiles enable row level security;
create policy "profile self read" on profiles for select using (id = auth.uid() or is_staff());
create policy "profile self update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "profile staff all" on profiles for all using (is_staff()) with check (is_staff());

-- ── Addresses / wishlist / reviews: owner-scoped ───────────────────────
alter table addresses enable row level security;
create policy "addr owner" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table wishlists enable row level security;
create policy "wish owner" on wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table reviews enable row level security;
create policy "review read" on reviews for select using (true);
create policy "review owner write" on reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Orders: owner reads own; staff read all; writes via service role ───
alter table orders enable row level security;
create policy "order owner read" on orders for select using (user_id = auth.uid() or is_staff());

alter table order_items enable row level security;
create policy "order items read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff()))
);

alter table coupons enable row level security;
create policy "coupons staff" on coupons for all using (is_staff()) with check (is_staff());
create policy "coupons read active" on coupons for select using (is_active);
