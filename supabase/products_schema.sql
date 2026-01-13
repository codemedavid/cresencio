-- Products table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  base_price decimal(10, 2) not null,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Product variations table (e.g., sizes, colors, paper types)
create table if not exists public.product_variations (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,  -- e.g., "Size", "Paper Type", "Finish"
  value text not null, -- e.g., "A4", "Glossy", "Matte"
  price_modifier decimal(10, 2) default 0, -- Additional cost for this variation
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- RLS policies
alter table public.products enable row level security;
alter table public.product_variations enable row level security;

-- Everyone can view active products
create policy "Active products are viewable by everyone" on public.products
  for select using (is_active = true);

-- Only admins can manage products (insert, update, delete)
create policy "Admins can manage products" on public.products
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Similar policies for variations
create policy "Variations are viewable with their product" on public.product_variations
  for select using (
    exists (
      select 1 from public.products 
      where products.id = product_id and products.is_active = true
    )
  );

create policy "Admins can manage variations" on public.product_variations
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
