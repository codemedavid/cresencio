-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'vip', 'user')),
  is_approved boolean default false,
  id_proof_url text,
  id_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Safely add the column if the table already existed without it
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'id_type') then
    alter table public.profiles add column id_type text;
  end if;
end $$;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile." on public.profiles
  for update using ((select auth.uid()) = id);

-- Create a storage bucket for ID proofs if it doesn't exist
insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', true)
on conflict (id) do nothing;

-- Set up RLS for storage
create policy "ID proofs are publicly accessible." on storage.objects
  for select using (bucket_id = 'id-proofs');

create policy "Authenticated users can upload ID proofs." on storage.objects
  for insert with check (bucket_id = 'id-proofs' and auth.role() = 'authenticated');
