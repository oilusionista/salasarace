-- ============================================================
-- COWORKING APP — Schema Supabase (PostgreSQL)
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------
-- Tabela: rooms (salas)
-- -------------------------------------------------------
create table if not exists rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  capacity    int  not null default 1,
  description text,
  amenities   text[] default '{}',
  color       text default '#1D9E75',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- -------------------------------------------------------
-- Tabela: profiles (perfis dos usuários)
-- -------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  email      text,
  role       text default 'member', -- 'admin' | 'member'
  created_at timestamptz default now()
);

-- Trigger: cria perfil automaticamente ao criar usuário
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- -------------------------------------------------------
-- Tabela: bookings (reservas)
-- -------------------------------------------------------
create table if not exists bookings (
  id           uuid primary key default uuid_generate_v4(),
  room_id      uuid not null references rooms(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  title        text not null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  attendees    int  default 1,
  notes        text,
  alerts       text[] default '{"30min"}',
  status       text default 'confirmed', -- 'confirmed' | 'cancelled'
  created_at   timestamptz default now(),

  -- Garantir que start < end
  constraint booking_time_order check (start_time < end_time)
);

-- Índice para busca por data e sala
create index if not exists idx_bookings_date_room on bookings(date, room_id);
create index if not exists idx_bookings_user on bookings(user_id);

-- -------------------------------------------------------
-- Função: detectar conflito de horário
-- -------------------------------------------------------
create or replace function check_booking_conflict(
  p_room_id    uuid,
  p_date       date,
  p_start_time time,
  p_end_time   time,
  p_exclude_id uuid default null
) returns boolean language sql as $$
  select exists (
    select 1 from bookings
    where room_id   = p_room_id
      and date      = p_date
      and status    = 'confirmed'
      and id       != coalesce(p_exclude_id, uuid_nil())
      and start_time < p_end_time
      and end_time   > p_start_time
  );
$$;

-- -------------------------------------------------------
-- View: relatório de ocupação por sala
-- -------------------------------------------------------
create or replace view booking_stats as
select
  r.id         as room_id,
  r.name       as room_name,
  r.color      as room_color,
  date_trunc('month', b.date) as month,
  count(*)     as total_bookings,
  sum(extract(epoch from (b.end_time - b.start_time)) / 3600) as total_hours,
  round(avg(b.attendees), 1) as avg_attendees
from bookings b
join rooms r on r.id = b.room_id
where b.status = 'confirmed'
group by r.id, r.name, r.color, date_trunc('month', b.date);

-- -------------------------------------------------------
-- Row Level Security (RLS)
-- -------------------------------------------------------
alter table rooms    enable row level security;
alter table profiles enable row level security;
alter table bookings enable row level security;

-- Rooms: todos lêem, admin escreve
drop policy if exists "rooms_read_all"    on rooms;
drop policy if exists "rooms_admin_write" on rooms;
create policy "rooms_read_all"    on rooms for select using (true);
create policy "rooms_admin_write" on rooms for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Profiles: usuário lê o próprio, admin lê todos
drop policy if exists "profiles_own"        on profiles;
drop policy if exists "profiles_admin"      on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_own"        on profiles for select using (auth.uid() = id);
create policy "profiles_admin"      on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Bookings: todos lêem, usuário cria/cancela o próprio
drop policy if exists "bookings_read_all"   on bookings;
drop policy if exists "bookings_insert"     on bookings;
drop policy if exists "bookings_update_own" on bookings;
drop policy if exists "bookings_admin_all"  on bookings;
create policy "bookings_read_all"   on bookings for select using (true);
create policy "bookings_insert"     on bookings for insert with check (auth.uid() = user_id);
create policy "bookings_update_own" on bookings for update using (auth.uid() = user_id);
create policy "bookings_admin_all"  on bookings for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- -------------------------------------------------------
-- Dados iniciais: salas
-- -------------------------------------------------------
insert into rooms (name, capacity, description, amenities, color) values
  ('Sala A — Reunião',       8,  'Sala de reuniões com TV e videoconferência',
   array['TV 65"','Videoconferência','Wi-Fi','Quadro branco'], '#378ADD'),
  ('Sala B — Foco',          4,  'Ambiente silencioso para trabalho concentrado',
   array['Monitor extra','Wi-Fi','Silenciosa'], '#7F77DD'),
  ('Sala C — Apresentação',  20, 'Auditório para eventos e workshops',
   array['Projetor','Microfone','Palco','Wi-Fi'], '#1D9E75'),
  ('Sala D — Phone Booth',   2,  'Cabine insonorizada para ligações',
   array['Insonorizada','Wi-Fi'], '#BA7517')
on conflict do nothing;
