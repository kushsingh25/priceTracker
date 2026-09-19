create table products (
  id bigserial primary key,
  store_product_id integer not null unique,
  name text not null,
  slug text,
  brand text,
  category text,
  sku text,
  added_at timestamptz default now()
);

create table price_history (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  price numeric not null,
  stock integer not null,
  scraped_at timestamptz default now()
);

create table scrape_log (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  attempted_at timestamptz default now(),
  status text not null,
  attempt_count integer not null,
  duration_ms integer,
  error_message text
);

create index price_history_product_id_idx on price_history(product_id);
create index scrape_log_product_id_idx on scrape_log(product_id);
