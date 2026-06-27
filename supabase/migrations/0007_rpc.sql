-- Inventory & order RPCs (development.md §6). All mutate under row locks to
-- avoid oversell / race conditions.

-- Recompute auto prices for all variants of a product from settings tiers.
create or replace function recompute_variant_prices(p_product uuid)
returns void language plpgsql as $$
declare
  v_price int;
  v_ml int;
  v_round int;
  v_tiers jsonb;
  rec record;
  base_per_ml numeric;
  coeff numeric;
begin
  select bottle_price::numeric / bottle_ml into base_per_ml
    from products where id = p_product;
  if base_per_ml is null then return; end if;

  select (value->>'roundTo')::int, value->'tiers'
    into v_round, v_tiers from settings where key = 'pricing';
  v_round := coalesce(v_round, 100);

  for rec in select * from product_variants where product_id = p_product loop
    select (t->>'coefficient')::numeric into coeff
      from jsonb_array_elements(v_tiers) t
      where (t->>'ml')::int = rec.ml
      limit 1;
    if coeff is null then coeff := 1; end if;
    v_price := ceil((base_per_ml * rec.ml * coeff) / v_round) * v_round;
    update product_variants set auto_price = v_price where id = rec.id;
  end loop;
end $$;

-- Reserve ml for an order. Returns true if reserved, false if insufficient.
create or replace function reserve_inventory(p_product uuid, p_ml int)
returns boolean language plpgsql as $$
declare
  v_avail int;
begin
  -- lock the inventory row
  select on_hand_ml - reserved_ml into v_avail
    from inventory where product_id = p_product for update;

  if v_avail is null or v_avail < p_ml then
    return false;
  end if;

  update inventory
    set reserved_ml = reserved_ml + p_ml
    where product_id = p_product;
  return true;
end $$;

-- Release a previous reserve (cancel / payment failure / timeout).
create or replace function release_inventory(p_product uuid, p_ml int)
returns void language plpgsql as $$
begin
  update inventory
    set reserved_ml = greatest(reserved_ml - p_ml, 0)
    where product_id = p_product;
  -- back in stock -> clear sold-out flag
  update inventory
    set is_sold_out = false
    where product_id = p_product and (on_hand_ml - reserved_ml) > 0;
end $$;

-- Commit a reserve on fulfilment: subtract from both reserved and on_hand.
create or replace function commit_inventory(p_product uuid, p_ml int)
returns void language plpgsql as $$
begin
  update inventory
    set reserved_ml = greatest(reserved_ml - p_ml, 0),
        on_hand_ml  = greatest(on_hand_ml - p_ml, 0)
    where product_id = p_product;
  update inventory
    set is_sold_out = true
    where product_id = p_product and (on_hand_ml - reserved_ml) <= 0;
end $$;

-- Restock: add ml + audit log.
create or replace function restock_inventory(p_product uuid, p_delta int, p_reason text, p_by uuid)
returns void language plpgsql as $$
begin
  insert into inventory (product_id, on_hand_ml)
    values (p_product, greatest(p_delta, 0))
  on conflict (product_id) do update
    set on_hand_ml = inventory.on_hand_ml + p_delta;

  insert into restock_log (product_id, delta_ml, reason, created_by)
    values (p_product, p_delta, coalesce(p_reason,''), p_by);

  update inventory
    set is_sold_out = (on_hand_ml - reserved_ml) <= 0
    where product_id = p_product;
end $$;

-- Auto-release expired reserves (called by pg_cron). Cancels pending orders
-- whose reserve window has lapsed and returns their ml.
create or replace function release_expired_reserves()
returns int language plpgsql as $$
declare
  v_order record;
  v_item record;
  n int := 0;
begin
  for v_order in
    select id from orders
    where status = 'pending'
      and payment_status = 'unpaid'
      and reserve_expires_at is not null
      and reserve_expires_at < now()
    for update skip locked
  loop
    for v_item in select product_id, ml, qty from order_items where order_id = v_order.id loop
      if v_item.product_id is not null then
        perform release_inventory(v_item.product_id, v_item.ml * v_item.qty);
      end if;
    end loop;
    update orders set status = 'cancelled' where id = v_order.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Mark products sold out when available <= 0 (safety net for cron).
create or replace function refresh_sold_out()
returns void language sql as $$
  update inventory set is_sold_out = (on_hand_ml - reserved_ml) <= 0;
$$;
