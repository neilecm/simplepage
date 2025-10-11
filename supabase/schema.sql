-- Supabase schema additions for vendor marketplace foundation
-- Vendors table
create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  store_name text not null,
  slug text unique not null,
  logo_url text,
  description text,
  created_at timestamptz default now()
);

-- Products table associated with vendors
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references vendors(id),
  name text not null,
  description text,
  price numeric not null,
  stock integer default 0,
  weight integer default 0,
  category text,
  image_url text,
  created_at timestamptz default now()
);
