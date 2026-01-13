-- Orders table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  variation_id uuid references public.product_variations(id) on delete set null,
  quantity integer not null default 1,
  description text,
  reference_file_urls text[] default '{}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  total_amount decimal(10, 2),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Migration: Add variation_id if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'variation_id') then
    alter table public.orders add column variation_id uuid references public.product_variations(id) on delete set null;
  end if;
end $$;

-- Index for faster queries
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- RLS policies
alter table public.orders enable row level security;

-- Users can view their own orders
create policy "Users can view their own orders" on public.orders
  for select using (auth.uid() = user_id);

-- Users can create their own orders
create policy "Users can create their own orders" on public.orders
  for insert with check (auth.uid() = user_id);

-- Admins can view all orders
create policy "Admins can view all orders" on public.orders
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can update orders (e.g., change status)
create policy "Admins can update orders" on public.orders
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can delete orders
create policy "Admins can delete orders" on public.orders
  for delete using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can insert orders (for creating orders on behalf of users)
create policy "Admins can create orders" on public.orders
  for insert with check (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_orders_updated
  before update on public.orders
  for each row
  execute function public.handle_updated_at();
