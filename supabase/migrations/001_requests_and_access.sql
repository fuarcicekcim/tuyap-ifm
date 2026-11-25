-- Fuar Çiçekçim / C aşaması. Yeni, boş Supabase projesinde bir kez çalıştırılır.
-- Mevcut katalog ve fuar verilerini taşımaz; örnek müşteri/sipariş eklemez.
begin;

create table public.fc_staff (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('owner','admin','operator','courier')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.fc_staff enable row level security;

create function public.fc_staff_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.fc_staff where user_id = (select auth.uid()) and active $$;
revoke all on function public.fc_staff_role() from public, anon;
grant execute on function public.fc_staff_role() to authenticated, service_role;
grant select on public.fc_staff to authenticated;
create policy staff_self_read on public.fc_staff for select to authenticated
  using (user_id = (select auth.uid()));
-- Üyeler kendi rolünü veya aktifliğini değiştiremez. Atama yalnız SQL Editor'den yapılır.

create table public.fc_requests (
  id uuid primary key,
  request_type text not null check (request_type in ('order_request','quote_request')),
  source text not null check (source in ('web_cart','web_quote')),
  reference text not null default '',
  status text not null default 'received' check (status = 'received'),
  input_sha256 text not null check (input_sha256 ~ '^[a-f0-9]{64}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  customer_name text not null,
  company_name text not null,
  phone text not null,
  email text not null default '',
  venue text not null check (venue in ('tuyap','ifm','both','other')),
  fair_name text not null default '',
  notes text not null default '',
  catalog_revision text not null default '',
  catalog_sha256 text not null default '',
  net_kurus bigint not null default 0 check (net_kurus >= 0),
  vat_kurus bigint not null default 0 check (vat_kurus >= 0),
  gross_kurus bigint not null default 0 check (gross_kurus = net_kurus + vat_kurus),
  mail_status text not null default 'pending' check (mail_status in ('pending','sending','sent','failed','unknown')),
  mail_claim_token uuid,
  mail_updated_at timestamptz,
  created_at timestamptz not null default now()
);
create index fc_requests_created_idx on public.fc_requests (created_at desc);
create index fc_requests_venue_created_idx on public.fc_requests (venue, created_at desc);
create index fc_requests_company_idx on public.fc_requests (company_name);

create table public.fc_request_deliveries (
  request_id uuid not null references public.fc_requests(id),
  delivery_id text not null,
  venue text not null check (venue in ('tuyap','ifm','both','other')),
  fair_name text not null default '',
  hall_no text not null default '',
  stand_no text not null default '',
  recipient_company text not null default '',
  recipient_name text not null default '',
  recipient_phone text not null default '',
  requested_date date,
  requested_slot text not null default '',
  scheduled_at timestamptz,
  time_zone text not null default 'Europe/Istanbul' check (time_zone = 'Europe/Istanbul'),
  notes text not null default '',
  assigned_to uuid references auth.users(id),
  primary key (request_id, delivery_id)
);
create index fc_deliveries_assigned_idx on public.fc_request_deliveries (assigned_to, scheduled_at);

create table public.fc_request_items (
  request_id uuid not null references public.fc_requests(id),
  line_key text not null,
  delivery_id text not null,
  product_id text not null,
  product_name text not null,
  qty integer not null check (qty between 1 and 99),
  unit_net_kurus bigint not null check (unit_net_kurus >= 0),
  vat_rate_bps integer not null check (vat_rate_bps between 0 and 10000),
  ribbon_mode text not null check (ribbon_mode in ('text','logo-only')),
  ribbon_text text not null default '',
  ribbon_color text check (ribbon_color in ('black','blue','red')),
  logo_file_name text not null default '',
  logo_status text not null default 'not_uploaded' check (logo_status = 'not_uploaded'),
  primary key (request_id, line_key),
  foreign key (request_id, delivery_id) references public.fc_request_deliveries(request_id, delivery_id),
  check (ribbon_mode <> 'logo-only' or (ribbon_text = '' and ribbon_color is null and logo_file_name <> ''))
);
create index fc_request_items_product_idx on public.fc_request_items(product_id);

create table public.fc_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.fc_requests(id),
  kind text not null check (kind in ('received','mail_claimed','mail_sent','mail_failed','mail_unknown')),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index fc_request_events_request_idx on public.fc_request_events(request_id, created_at);

alter table public.fc_requests enable row level security;
alter table public.fc_request_deliveries enable row level security;
alter table public.fc_request_items enable row level security;
alter table public.fc_request_events enable row level security;
revoke all on public.fc_staff, public.fc_requests, public.fc_request_deliveries,
  public.fc_request_items, public.fc_request_events from anon, authenticated;
grant select on public.fc_staff, public.fc_requests, public.fc_request_deliveries,
  public.fc_request_items, public.fc_request_events to authenticated;
create policy request_staff_read on public.fc_requests for select to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin','operator'));
create policy delivery_staff_read on public.fc_request_deliveries for select to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin','operator')
    or ((select public.fc_staff_role()) = 'courier' and assigned_to = (select auth.uid())));
create policy item_staff_read on public.fc_request_items for select to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin','operator'));
create policy events_staff_read on public.fc_request_events for select to authenticated
  using ((select public.fc_staff_role()) in ('owner','admin','operator'));
-- C aşamasında istemciden doğrudan yazma/durum değiştirme izni verilmez.

-- İdempotency müşteri isteğine bağlıdır; katalog sonradan değişse de ilk snapshot korunur.
-- Yalnız PHP köprüsünün ürettiği normalize input parmak izi kabul edilir; tarayıcı hash'i değildir.
create function public.fc_find_request(p_request_id uuid, p_input_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_existing public.fc_requests%rowtype;
begin
  if p_request_id is null or p_input_sha256 is null or p_input_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid request identity';
  end if;
  select r.* into v_existing from public.fc_requests as r where r.id = p_request_id;
  if not found then return null; end if;
  if v_existing.input_sha256 <> p_input_sha256 then
    raise exception using errcode = 'PT409', message = 'Request identity conflict';
  end if;
  return v_existing.payload;
end $$;
revoke all on function public.fc_find_request(uuid,text) from public, anon, authenticated;
grant execute on function public.fc_find_request(uuid,text) to service_role;

create function public.fc_intake_request(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_request_id uuid := (p_request->>'request_id')::uuid;
  v_input_hash text := p_request->>'input_sha256';
  digest text := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_request::text, 'UTF8')), 'hex');
  existing_hash text;
  existing_digest text;
  existing_payload jsonb;
  inserted integer;
  row_data jsonb;
  net bigint := 0;
  vat bigint := 0;
begin
  if v_request_id is null or v_input_hash is null or v_input_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid request identity';
  end if;
  if jsonb_typeof(p_request) is distinct from 'object'
     or not coalesce(p_request->>'request_type' in ('order_request','quote_request'), false)
     or jsonb_typeof(p_request->'items') is distinct from 'array'
     or jsonb_typeof(p_request->'deliveries') is distinct from 'array'
     or coalesce(p_request#>>'{customer,name}', '') = ''
     or coalesce(p_request#>>'{customer,company}', '') = ''
     or coalesce(p_request#>>'{customer,phone}', '') = '' then
    raise exception using errcode = '22023', message = 'Invalid request';
  end if;
  -- Dizi türleri doğrulandıktan sonra uzunluk okunur; yanlış türde belirsiz ifade sırasına bağlı kalınmaz.
  if jsonb_array_length(p_request->'items') > 99 or jsonb_array_length(p_request->'deliveries') > 99 then
    raise exception using errcode = '22023', message = 'Invalid request size';
  end if;
  for row_data in select value from jsonb_array_elements(p_request->'items') loop
    net := net + (row_data->>'unit_net_kurus')::bigint * (row_data->>'qty')::integer;
    vat := vat + round((row_data->>'unit_net_kurus')::numeric * (row_data->>'qty')::integer * (row_data->>'vat_rate_bps')::integer / 10000)::bigint;
  end loop;
  insert into public.fc_requests(id, request_type, source, reference, input_sha256, payload_sha256, payload,
    customer_name, company_name, phone, email, venue, fair_name, notes,
    catalog_revision, catalog_sha256, net_kurus, vat_kurus, gross_kurus)
  values (v_request_id, p_request->>'request_type', p_request->>'source', coalesce(p_request->>'reference',''), v_input_hash, digest, p_request,
    p_request#>>'{customer,name}', p_request#>>'{customer,company}', p_request#>>'{customer,phone}', coalesce(p_request#>>'{customer,email}', ''),
    p_request#>>'{event,venue}', coalesce(p_request#>>'{event,fair_name}', ''), coalesce(p_request->>'notes', ''),
    coalesce(p_request->>'catalog_revision', ''), coalesce(p_request->>'catalog_sha256', ''), net, vat, net + vat)
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    select r.input_sha256, r.payload_sha256, r.payload into existing_hash, existing_digest, existing_payload from public.fc_requests as r where r.id = v_request_id;
    if existing_hash is distinct from v_input_hash then raise exception using errcode = 'PT409', message = 'Request identity conflict'; end if;
    return jsonb_build_object('request_id', v_request_id, 'created', false, 'replayed', true, 'status', 'received', 'payload_sha256', existing_digest, 'request', existing_payload);
  end if;
  for row_data in select value from jsonb_array_elements(p_request->'deliveries') loop
    insert into public.fc_request_deliveries(request_id, delivery_id, venue, fair_name, hall_no, stand_no,
      recipient_company, recipient_name, recipient_phone, requested_date, requested_slot, scheduled_at, notes)
    values(v_request_id, row_data->>'delivery_id', row_data->>'venue', coalesce(row_data->>'fair_name',''),
      coalesce(row_data->>'hall_no',''), coalesce(row_data->>'stand_no',''), coalesce(row_data->>'recipient_company',''),
      coalesce(row_data->>'recipient_name',''), coalesce(row_data->>'recipient_phone',''),
      nullif(row_data->>'requested_date','')::date, coalesce(row_data->>'requested_slot',''),
      nullif(row_data->>'scheduled_at','')::timestamptz, coalesce(row_data->>'notes',''));
  end loop;
  for row_data in select value from jsonb_array_elements(p_request->'items') loop
    insert into public.fc_request_items(request_id,line_key,delivery_id,product_id,product_name,qty,unit_net_kurus,vat_rate_bps,
      ribbon_mode,ribbon_text,ribbon_color,logo_file_name)
    values(v_request_id,row_data->>'line_key',row_data->>'delivery_id',row_data->>'product_id',row_data->>'product_name',
      (row_data->>'qty')::integer,(row_data->>'unit_net_kurus')::bigint,(row_data->>'vat_rate_bps')::integer,
      row_data#>>'{ribbon,mode}',coalesce(row_data#>>'{ribbon,text}',''),row_data#>>'{ribbon,color}',coalesce(row_data#>>'{ribbon,logo_file_name}',''));
  end loop;
  insert into public.fc_request_events(request_id,kind) values(v_request_id,'received');
  return jsonb_build_object('request_id',v_request_id,'created',true,'replayed',false,'status','received','payload_sha256',digest,'request',p_request);
end $$;
revoke all on function public.fc_intake_request(jsonb) from public, anon, authenticated;
grant execute on function public.fc_intake_request(jsonb) to service_role;

create function public.fc_claim_request_mail(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare token uuid; state text;
begin
  token := gen_random_uuid();
  update public.fc_requests set mail_status='sending',mail_claim_token=token,mail_updated_at=now()
    where id=p_request_id and mail_status='pending';
  if found then
    insert into public.fc_request_events(request_id,kind) values(p_request_id,'mail_claimed');
    return jsonb_build_object('claimed',true,'claim_token',token,'status','sending');
  end if;
  select mail_status into state from public.fc_requests where id=p_request_id;
  if state is null then raise exception using errcode='22023',message='Request not found'; end if;
  return jsonb_build_object('claimed',false,'claim_token',null,'status',state);
end $$;
create function public.fc_finish_request_mail(p_request_id uuid,p_claim_token uuid,p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','failed','unknown') then raise exception using errcode='22023',message='Invalid mail state'; end if;
  update public.fc_requests set mail_status=p_status,mail_updated_at=now()
    where id=p_request_id and mail_claim_token=p_claim_token and mail_status='sending';
  if not found then raise exception using errcode='PT409',message='Mail claim conflict'; end if;
  insert into public.fc_request_events(request_id,kind) values(p_request_id,'mail_'||p_status);
  return jsonb_build_object('ok',true,'status',p_status);
end $$;
revoke all on function public.fc_claim_request_mail(uuid),public.fc_finish_request_mail(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.fc_claim_request_mail(uuid),public.fc_finish_request_mail(uuid,uuid,text) to service_role;

-- Özgün logo aktarımı henüz etkin değil. Metadata dosyanın yüklendiği anlamına gelmez.
insert into storage.buckets(id,name,public) values('fc-order-assets','fc-order-assets',false) on conflict(id) do nothing;
do $$ begin
  if exists(select 1 from storage.buckets where id='fc-order-assets' and public) then
    raise exception 'fc-order-assets must be a private bucket';
  end if;
end $$;
create policy fc_order_assets_staff_read on storage.objects for select to authenticated
  using(bucket_id='fc-order-assets' and (select public.fc_staff_role()) in ('owner','admin','operator'));

comment on table public.fc_requests is 'Gelen talepler; onaylanmış satış veya tahsilat değildir.';
commit;
