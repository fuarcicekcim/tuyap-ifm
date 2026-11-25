-- Fuar Çiçekçim / canlı katalog katmanı (anında fiyat, stok, aç/kapat, sıralama, rozet ve indirim).
-- 001 çalıştırılmış projede BİR KEZ çalıştırılır. ÖNCE İNCELEYİN; dosyanın tamamı tek seferde çalıştırılır.
--
-- Model: products-data.js (statik katalog) ana kaynak ve yedek olarak kalır. Bu tablo yalnız "son yayından beri
-- yapılan değişiklikleri" taşır. Bir satır, o ürünün TAM canlı durumudur (kısmi değil): satır varsa site bu değerleri
-- kullanır, yoksa statik katalogdaki değer geçerlidir. Satır silinirse ürün statik değerine döner.
-- Tutarlılık: derleme öncesi canlı katman products-data.js içine işlenir (sonraki adım), böylece ikisi ayrışmaz.
--
-- Güvenlik: herkes (anon) yalnız herkese açık sütunları okur (fiyat zaten vitrinde yayımlanır; updated_by okunamaz).
-- Yazma/silme yalnız fc_staff içinde aktif owner/admin rolüne açıktır; updated_at/updated_by sunucuda damgalanır.
-- Her değişiklik fc_live_audit tablosuna (eski/yeni değer, kim) yazılır; tabloya istemci yazamaz.
begin;

create table public.fc_live_products (
  product_id text primary key
    check (product_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(product_id) <= 80),
  price numeric(12,2) not null check (price >= 0 and price <= 1000000),   -- KDV hariç TL (katalogla aynı)
  in_stock boolean not null default true,
  active boolean not null default true,
  sort_order integer check (sort_order between 0 and 1000000),
  bestseller_rank integer check (bestseller_rank between 1 and 5),
  badge text not null default '' check (badge ~ '^[a-z0-9-]{0,40}$'),
  discount_price numeric(12,2),
  discount_previous numeric(12,2),
  discount_starts_on date,
  discount_ends_on date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  -- İndirim ya hiç yoktur ya da dört alanıyla eksiksizdir; katalogdaki kural ile aynı:
  -- indirimli fiyat < önceki fiyat <= ürün fiyatı, başlangıç <= bitiş.
  constraint fc_live_discount_complete check (
    (discount_price is null and discount_previous is null and discount_starts_on is null and discount_ends_on is null)
    or (discount_price is not null and discount_previous is not null
        and discount_starts_on is not null and discount_ends_on is not null
        and discount_price >= 0 and discount_price < discount_previous and discount_previous <= price
        and discount_starts_on <= discount_ends_on)
  ),
  -- "En çok satan" sırası benzersizdir; kontrol komutun sonunda yapıldığı için iki ürünün sırası tek komutta takas edilebilir.
  constraint fc_live_rank_unique unique (bestseller_rank) deferrable initially deferred
);
alter table public.fc_live_products enable row level security;

create table public.fc_live_audit (
  id bigint generated always as identity primary key,
  product_id text not null,
  action text not null check (action in ('insert','update','delete')),
  old_row jsonb,
  new_row jsonb,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index fc_live_audit_product_idx on public.fc_live_audit (product_id, created_at desc);
alter table public.fc_live_audit enable row level security;

-- Zaman ve kullanıcı damgası istemciden alınmaz; ürün kimliği sonradan değiştirilemez.
create function public.fc_live_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.product_id is distinct from old.product_id then
    raise exception using errcode = '22023', message = 'product_id cannot be changed';
  end if;
  new.updated_at := pg_catalog.now();
  new.updated_by := (select auth.uid());
  return new;
end $$;
revoke all on function public.fc_live_stamp() from public, anon, authenticated;
create trigger fc_live_stamp before insert or update on public.fc_live_products
  for each row execute function public.fc_live_stamp();

-- Değişiklik kaydı: değer değişmediyse (yalnız damga) kayıt açılmaz.
create function public.fc_live_audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.fc_live_audit(product_id, action, old_row, new_row, actor_id)
    values (old.product_id, 'delete', pg_catalog.to_jsonb(old), null, (select auth.uid()));
    return old;
  elsif tg_op = 'UPDATE' then
    if (pg_catalog.to_jsonb(old) - 'updated_at' - 'updated_by') is not distinct from (pg_catalog.to_jsonb(new) - 'updated_at' - 'updated_by') then
      return new;
    end if;
    insert into public.fc_live_audit(product_id, action, old_row, new_row, actor_id)
    values (new.product_id, 'update', pg_catalog.to_jsonb(old), pg_catalog.to_jsonb(new), (select auth.uid()));
    return new;
  end if;
  insert into public.fc_live_audit(product_id, action, old_row, new_row, actor_id)
  values (new.product_id, 'insert', null, pg_catalog.to_jsonb(new), (select auth.uid()));
  return new;
end $$;
revoke all on function public.fc_live_audit_row() from public, anon, authenticated;
create trigger fc_live_audit after insert or update or delete on public.fc_live_products
  for each row execute function public.fc_live_audit_row();

-- Yetkiler: önce her şey kapatılır, sonra yalnız gerekenler açılır (Supabase varsayılan yetkileri geniştir).
revoke all on public.fc_live_products, public.fc_live_audit from anon, authenticated;

grant select (product_id, price, in_stock, active, sort_order, bestseller_rank, badge,
  discount_price, discount_previous, discount_starts_on, discount_ends_on, updated_at)
  on public.fc_live_products to anon, authenticated;
grant insert (product_id, price, in_stock, active, sort_order, bestseller_rank, badge,
  discount_price, discount_previous, discount_starts_on, discount_ends_on)
  on public.fc_live_products to authenticated;
-- product_id güncelleme yetkisi, PostgREST'in upsert (merge-duplicates) komutu için gereklidir; değişimi tetikleyici engeller.
grant update (product_id, price, in_stock, active, sort_order, bestseller_rank, badge,
  discount_price, discount_previous, discount_starts_on, discount_ends_on)
  on public.fc_live_products to authenticated;
grant delete on public.fc_live_products to authenticated;
grant select on public.fc_live_audit to authenticated;

create policy live_public_read on public.fc_live_products for select to anon, authenticated using (true);
create policy live_admin_insert on public.fc_live_products for insert to authenticated
  with check ((select public.fc_staff_role()) in ('owner','admin'));
create policy live_admin_update on public.fc_live_products for update to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin'))
  with check ((select public.fc_staff_role()) in ('owner','admin'));
create policy live_admin_delete on public.fc_live_products for delete to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin'));
create policy live_audit_staff_read on public.fc_live_audit for select to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin'));

commit;
