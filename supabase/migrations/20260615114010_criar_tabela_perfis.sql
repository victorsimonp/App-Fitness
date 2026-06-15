create table public.usuarios (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  email text not null,
  criado_em timestamptz default now() not null
);

create table public.analises (
  id uuid default gen_random_uuid() primary key,
  id_usuario uuid references public.usuarios(id) on delete cascade not null,
  peso decimal(5,2),
  altura decimal(3,2),
  medidas jsonb,
  foto_url text,
  criado_em timestamptz default now() not null
);

create table public.treinos (
  id uuid default gen_random_uuid() primary key,
  id_usuario uuid references public.usuarios(id) on delete cascade not null,
  titulo text not null,
  conteudo_json jsonb not null,
  ativo boolean default true not null,
  criado_em timestamptz default now() not null
);

create table public.dietas (
  id uuid default gen_random_uuid() primary key,
  id_usuario uuid references public.usuarios(id) on delete cascade not null,
  objetivo text not null,
  conteudo_json jsonb not null,
  ativo boolean default true not null,
  criado_em timestamptz default now() not null
);

alter table public.usuarios enable row level security;
alter table public.analises enable row level security;
alter table public.treinos enable row level security;
alter table public.dietas enable row level security;

create policy "Gestao do proprio perfil" 
  on public.usuarios for all 
  using (auth.uid() = id);

create policy "Gestao das proprias analises" 
  on public.analises for all 
  using (auth.uid() = id_usuario);

create policy "Gestao dos proprios treinos" 
  on public.treinos for all 
  using (auth.uid() = id_usuario);

create policy "Gestao das proprias dietas" 
  on public.dietas for all 
  using (auth.uid() = id_usuario);