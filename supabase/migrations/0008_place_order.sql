-- Atomic order placement (Phase 3). Reserves inventory for every line and
-- inserts the order + items in one transaction. Rolls back on any shortage.
--
-- p_items: jsonb array of
--   { product_id, variant_id, ml, qty, is_sample }
-- p_order: jsonb with contact/shipping/payment fields.
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
  v_discount int := coalesce((p_order->>'discount')::int, 0);
  v_loyalty int := coalesce((p_order->>'loyalty_used')::int, 0);
  v_total int;
  v_pname text;
  v_brand text;
  v_reserve_min int := coalesce((p_order->>'reserve_minutes')::int, 30);
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
    shipping_fee, discount, loyalty_used, coupon_code,
    reserve_expires_at, subtotal, total
  ) values (
    nullif(p_order->>'user_id','')::uuid,
    coalesce((p_order->>'payment_method')::payment_method_t,'qpay'),
    p_order->>'contact_name', p_order->>'contact_phone', p_order->>'contact_email',
    coalesce(p_order->>'ship_city','Улаанбаатар'), p_order->>'ship_district',
    p_order->>'ship_detail', p_order->>'ship_zone', p_order->>'note',
    v_shipping, v_discount, v_loyalty, p_order->>'coupon_code',
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

  v_total := greatest(v_subtotal + v_shipping - v_discount - v_loyalty, 0);
  update orders set subtotal = v_subtotal, total = v_total where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'order_no', v_order_no, 'total', v_total);
end $$;

-- Confirm payment: mark paid + commit inventory.
create or replace function mark_order_paid(p_order uuid)
returns void language plpgsql as $$
declare v_item record;
begin
  update orders set payment_status = 'paid', status = 'confirmed',
    reserve_expires_at = null where id = p_order;
  for v_item in select product_id, ml, qty from order_items where order_id = p_order loop
    if v_item.product_id is not null then
      perform commit_inventory(v_item.product_id, v_item.ml * v_item.qty);
    end if;
  end loop;
end $$;

-- Cancel order: release reserved inventory.
create or replace function cancel_order(p_order uuid)
returns void language plpgsql as $$
declare v_item record;
begin
  for v_item in select product_id, ml, qty from order_items where order_id = p_order loop
    if v_item.product_id is not null then
      perform release_inventory(v_item.product_id, v_item.ml * v_item.qty);
    end if;
  end loop;
  update orders set status = 'cancelled' where id = p_order;
end $$;
