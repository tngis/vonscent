-- Supabase Storage bucket for product/blog images (public read, staff write).

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read of objects in this bucket.
do $$ begin
  create policy "product images public read"
    on storage.objects for select
    using (bucket_id = 'product-images');
exception when duplicate_object then null; end $$;

-- Only staff (operator/super_admin) may upload / modify / delete.
do $$ begin
  create policy "product images staff write"
    on storage.objects for insert
    with check (bucket_id = 'product-images' and is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "product images staff update"
    on storage.objects for update
    using (bucket_id = 'product-images' and is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "product images staff delete"
    on storage.objects for delete
    using (bucket_id = 'product-images' and is_staff());
exception when duplicate_object then null; end $$;
