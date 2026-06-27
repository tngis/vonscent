-- Business functions: coupon validation, loyalty earn/redeem, order status.
-- place_order / mark_order_paid replace the versions from 0008.

-- ── Coupon validation (server-authoritative) ──────────────────────────
-- Returns { valid, discount, code, reason }. discount is the ₮ amount.
create or replace function validate_coupon(p_code text, p_subtotal int)
returns jsonb language plpgsql stable as $$
declare
  c coupons%rowtype;
  v_discount int := 0;
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'EMPTY');
  end if;

  select * into c from coupons where upper(code) = upper(btrim(p_code)) limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'NOT_FOUND');
  end if;
  if not c.is_active then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'INACTIVE');
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'NOT_STARTED');
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'EXPIRED');
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'MAX_USES');
  end if;
  if p_subtotal < c.min_subtotal then
    return jsonb_build_object('valid', false, 'discount', 0,
      'reason', 'MIN_SUBTOTAL', 'minSubtotal', c.min_subtotal);
  end if;

  if c.type = 'percent' then
    v_discount := floor(p_subtotal * c.value / 100.0);
  else
    v_discount := least(c.value, p_subtotal);
  end if;

  return jsonb_build_object('valid', true, 'discount', v_discount,
    'code', c.code, 'type', c.type, 'value', c.value);
end $$;

-- ── place_order (replaces 0008) ────────────────────────────────────────
-- Server recomputes discount from the coupon and clamps loyalty redemption.
create or replace function place_order(p_order jsonb, p_items jsonb)
returns jsonb language plpgsql as $$
declare
  v_order_id uuid;
  v_order_no text;
  v_item jsonb;
  v_product uuid;
  v_variant uuid;
  v_ml int;
  v_qty int;
  v_sample boolean;
  v_unit int;
  v_need int;
  v_subtotal int := 0;
  v_shipping int := coalesce((p_order->>'shipping_fee')::int, 0);
  v_discount int := 0;
  v_loyalty int := greatest(coalesce((p_order->>'loyalty_used')::int, 0), 0);
  v_total int;
  v_pname text;
  v_brand text;
  v_reserve_min int := coalesce((p_order->>'reserve_minutes')::int, 30);
  v_user uuid := nullif(p_order->>'user_id','')::uuid;
  v_code text := nullif(btrim(coalesce(p_order->>'coupon_code','')), '');
  v_coupon jsonb;
  v_redeem_rate numeric;
  v_avail_points int;
  v_points_used int;
begin
  -- First pass: reserve every line (fails fast on shortage).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product := (v_item->>'product_id')::uuid;
    v_ml := (v_item->>'ml')::int;
    v_qty := (v_item->>'qty')::int;
    v_need := v_ml * v_qty;
    if not reserve_inventory(v_product, v_need) then
      raise exception 'INSUFFICIENT_STOCK:%', v_product
        using errcode = 'check_violation';
    end if;
  end loop;

  insert into orders (
    user_id, payment_method, contact_name, contact_phone, contact_email,
    ship_city, ship_district, ship_detail, ship_zone, note,
    shipping_fee, coupon_code, reserve_expires_at, subtotal, total
  ) values (
    v_user,
    coalesce((p_order->>'payment_method')::payment_method_t,'qpay'),
    p_order->>'contact_name', p_order->>'contact_phone', p_order->>'contact_email',
    coalesce(p_order->>'ship_city','Улаанбаатар'), p_order->>'ship_district',
    p_order->>'ship_detail', p_order->>'ship_zone', p_order->>'note',
    v_shipping, v_code,
    now() + (v_reserve_min || ' minutes')::interval, 0, 0
  ) returning id, order_no into v_order_id, v_order_no;

  -- Second pass: insert items with price snapshots.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product := (v_item->>'product_id')::uuid;
    v_variant := nullif(v_item->>'variant_id','')::uuid;
    v_ml := (v_item->>'ml')::int;
    v_qty := (v_item->>'qty')::int;
    v_sample := coalesce((v_item->>'is_sample')::boolean, false);

    select variant_price(pv.*) into v_unit
      from product_variants pv where pv.id = v_variant;
    v_unit := coalesce(v_unit, 0);
    select name, brand into v_pname, v_brand from products where id = v_product;

    insert into order_items (
      order_id, product_id, variant_id, product_name, brand,
      ml, unit_price, qty, is_sample, line_total
    ) values (
      v_order_id, v_product, v_variant, coalesce(v_pname,''), coalesce(v_brand,''),
      v_ml, v_unit, v_qty, v_sample, v_unit * v_qty
    );
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  -- Coupon: recompute discount on the server.
  if v_code is not null then
    v_coupon := validate_coupon(v_code, v_subtotal);
    if (v_coupon->>'valid')::boolean then
      v_discount := (v_coupon->>'discount')::int;
      update coupons set used_count = used_count + 1 where upper(code) = upper(v_code);
    else
      v_discount := 0;
    end if;
  end if;

  -- Loyalty redemption: clamp to available points and remaining payable.
  if v_user is not null and v_loyalty > 0 then
    select coalesce((value->>'redeemRate')::numeric, 1) into v_redeem_rate
      from settings where key = 'loyalty';
    v_redeem_rate := coalesce(v_redeem_rate, 1);
    select loyalty_points into v_avail_points from profiles where id = v_user;
    v_loyalty := least(
      v_loyalty,
      floor(coalesce(v_avail_points,0) * v_redeem_rate)::int,
      greatest(v_subtotal + v_shipping - v_discount, 0)
    );
    if v_loyalty > 0 then
      v_points_used := ceil(v_loyalty / v_redeem_rate)::int;
      update profiles set loyalty_points = greatest(loyalty_points - v_points_used, 0)
        where id = v_user;
      insert into loyalty_ledger (user_id, order_id, delta, reason)
        values (v_user, v_order_id, -v_points_used, 'redeem');
    end if;
  else
    v_loyalty := 0;
  end if;

  v_total := greatest(v_subtotal + v_shipping - v_discount - v_loyalty, 0);
  update orders set subtotal = v_subtotal, discount = v_discount,
    loyalty_used = v_loyalty, total = v_total where id = v_order_id;

  insert into order_status_history (order_id, status, note, changed_by)
    values (v_order_id, 'pending', 'Захиалга үүсгэгдсэн', v_user);

  return jsonb_build_object('order_id', v_order_id, 'order_no', v_order_no, 'total', v_total);
end $$;

-- ── mark_order_paid (replaces 0008): commit inventory + earn loyalty ───
create or replace function mark_order_paid(p_order uuid)
returns void language plpgsql as $$
declare
  v_item record;
  v_user uuid;
  v_status payment_status_t;
  v_total int;
  v_earn_per int;
  v_earn_points int;
  v_earned int;
begin
  select user_id, payment_status, total into v_user, v_status, v_total
    from orders where id = p_order;
  if v_status = 'paid' then
    return;  -- idempotent: don't double-earn / double-commit
  end if;

  update orders set payment_status = 'paid', status = 'confirmed',
    reserve_expires_at = null where id = p_order;

  for v_item in select product_id, ml, qty from order_items where order_id = p_order loop
    if v_item.product_id is not null then
      perform commit_inventory(v_item.product_id, v_item.ml * v_item.qty);
    end if;
  end loop;

  insert into order_status_history (order_id, status, note)
    values (p_order, 'confirmed', 'Төлбөр төлөгдсөн');

  -- Earn loyalty points.
  if v_user is not null then
    select coalesce((value->>'earnPer')::int, 1000),
           coalesce((value->>'earnPoints')::int, 1)
      into v_earn_per, v_earn_points
      from settings where key = 'loyalty';
    v_earn_per := coalesce(v_earn_per, 1000);
    v_earn_points := coalesce(v_earn_points, 1);
    if v_earn_per > 0 then
      v_earned := floor(v_total / v_earn_per) * v_earn_points;
      if v_earned > 0 then
        update profiles set loyalty_points = loyalty_points + v_earned where id = v_user;
        insert into loyalty_ledger (user_id, order_id, delta, reason)
          values (v_user, p_order, v_earned, 'earn');
      end if;
    end if;
  end if;
end $$;

-- ── Admin: update order status (+ history, inventory release on cancel) ─
create or replace function update_order_status(
  p_order uuid, p_status order_status_t, p_note text, p_by uuid
) returns void language plpgsql as $$
declare v_item record;
begin
  if p_status = 'cancelled' then
    for v_item in select product_id, ml, qty from order_items where order_id = p_order loop
      if v_item.product_id is not null then
        perform release_inventory(v_item.product_id, v_item.ml * v_item.qty);
      end if;
    end loop;
  end if;

  update orders set status = p_status,
    reserve_expires_at = case when p_status in ('cancelled') then null else reserve_expires_at end
    where id = p_order;

  insert into order_status_history (order_id, status, note, changed_by)
    values (p_order, p_status, coalesce(p_note,''), p_by);
end $$;

-- ── Admin: mark refunded ───────────────────────────────────────────────
create or replace function mark_order_refunded(p_order uuid, p_by uuid)
returns void language plpgsql as $$
begin
  update orders set payment_status = 'refunded' where id = p_order;
  insert into order_status_history (order_id, status, note, changed_by)
    select id, status, 'Төлбөр буцаагдсан', p_by from orders where id = p_order;
end $$;

-- ── Recompute a product rating from its reviews ────────────────────────
create or replace function recompute_rating(p_product uuid)
returns void language plpgsql as $$
declare v_avg numeric; v_cnt int;
begin
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
    into v_avg, v_cnt from reviews where product_id = p_product;
  update products set rating_avg = v_avg, rating_count = v_cnt where id = p_product;
end $$;
