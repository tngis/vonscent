-- Extra concentration types (requirement: Extrait/Elixir de Parfum) and a
-- corrected loyalty earn base (earn on the discounted product subtotal only —
-- never on shipping; coupon discount applied first).

alter type concentration_t add value if not exists 'Extrait';
alter type concentration_t add value if not exists 'Elixir';

-- Re-earn loyalty on (subtotal - discount), excluding shipping.
create or replace function mark_order_paid(p_order uuid)
returns void language plpgsql as $$
declare
  v_item record;
  v_user uuid;
  v_status payment_status_t;
  v_subtotal int;
  v_discount int;
  v_base int;
  v_earn_per int;
  v_earn_points int;
  v_earned int;
begin
  select user_id, payment_status, subtotal, discount
    into v_user, v_status, v_subtotal, v_discount
    from orders where id = p_order;
  if v_status = 'paid' then
    return;  -- idempotent
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

  if v_user is not null then
    select coalesce((value->>'earnPer')::int, 100),
           coalesce((value->>'earnPoints')::int, 1)
      into v_earn_per, v_earn_points
      from settings where key = 'loyalty';
    v_earn_per := coalesce(v_earn_per, 100);
    v_earn_points := coalesce(v_earn_points, 1);
    -- Points are earned on the post-coupon product subtotal, never shipping.
    v_base := greatest(coalesce(v_subtotal,0) - coalesce(v_discount,0), 0);
    if v_earn_per > 0 then
      v_earned := floor(v_base / v_earn_per) * v_earn_points;
      if v_earned > 0 then
        update profiles set loyalty_points = loyalty_points + v_earned where id = v_user;
        insert into loyalty_ledger (user_id, order_id, delta, reason)
          values (v_user, p_order, v_earned, 'earn');
      end if;
    end if;
  end if;
end $$;

-- Default loyalty rule = 1% (1 point per 100₮).
update settings set value = jsonb_build_object('earnPer', 100, 'earnPoints', 1, 'redeemRate', 1)
  where key = 'loyalty';
