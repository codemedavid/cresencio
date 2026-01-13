-- Payment Methods table
create table if not exists public.payment_methods (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index for faster queries
create index if not exists payment_methods_is_active_idx on public.payment_methods(is_active);

-- RLS policies
alter table public.payment_methods enable row level security;

-- Everyone can view active payment methods
create policy "Anyone can view active payment methods" on public.payment_methods
  for select using (is_active = true);

-- Admins can view all payment methods
create policy "Admins can view all payment methods" on public.payment_methods
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can create payment methods
create policy "Admins can create payment methods" on public.payment_methods
  for insert with check (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can update payment methods
create policy "Admins can update payment methods" on public.payment_methods
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can delete payment methods
create policy "Admins can delete payment methods" on public.payment_methods
  for delete using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp (create if not exists)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at timestamp
drop trigger if exists on_payment_methods_updated on public.payment_methods;
create trigger on_payment_methods_updated
  before update on public.payment_methods
  for each row
  execute function public.handle_updated_at();

-- Add payment_method_id to orders table (only if orders table exists)
-- Run this after creating the orders table if it doesn't exist yet
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'orders') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'payment_method_id') then
      alter table public.orders add column payment_method_id uuid references public.payment_methods(id) on delete set null;
    end if;
  end if;
end $$;
