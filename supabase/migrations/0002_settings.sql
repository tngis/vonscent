-- Key/value store settings (admin A10): pricing tiers, store info, shipping.
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- Seed defaults.
insert into settings (key, value) values
  ('pricing', jsonb_build_object(
     'roundTo', 100,
     'tiers', jsonb_build_array(
       jsonb_build_object('ml', 5,  'coefficient', 1.8),
       jsonb_build_object('ml', 10, 'coefficient', 1.5),
       jsonb_build_object('ml', 20, 'coefficient', 1.3)
     ))),
  ('store', jsonb_build_object(
     'name', 'vonscent',
     'phone', '',
     'email', 'hello@vonscent.mn',
     'address', 'Улаанбаатар')),
  ('shipping', jsonb_build_object(
     'zones', jsonb_build_array(
       jsonb_build_object('name','Улаанбаатар дотор','fee', 5000),
       jsonb_build_object('name','Орон нутаг','fee', 12000)
     ),
     'freeOver', 150000)),
  ('loyalty', jsonb_build_object('earnPer', 1000, 'earnPoints', 1, 'redeemRate', 1))
on conflict (key) do nothing;
