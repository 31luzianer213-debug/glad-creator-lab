-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Usuario ve seus papeis"
on public.user_roles for select to authenticated
using (user_id = auth.uid());

-- Produtos
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  categoria text not null default 'adulto',
  tamanho text not null default '',
  estado text not null default '',
  status text not null default 'available',
  troca text not null default '',
  descricao text not null default '',
  imagem text not null default '',
  "createdAt" timestamptz not null default now()
);

grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
grant all on public.produtos to service_role;

alter table public.produtos enable row level security;

create policy "Catalogo publico" on public.produtos for select to anon, authenticated using (true);
create policy "Admin insere produto" on public.produtos for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin edita produto" on public.produtos for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin exclui produto" on public.produtos for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Reservas (dados pessoais: leitura apenas para admin)
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  "nomeCompleto" text not null default '',
  contato text not null default '',
  "codigoProduto" text not null default '',
  "nomeProduto" text not null default '',
  "tipoDoacao" text not null default '',
  "itemDoacao" text not null default '',
  quantidade integer not null default 0,
  status text not null default 'Pendente',
  "observacoesEquipe" text not null default '',
  "createdAt" timestamptz not null default now()
);

grant insert on public.reservas to anon;
grant select, insert, update, delete on public.reservas to authenticated;
grant all on public.reservas to service_role;

alter table public.reservas enable row level security;

create policy "Qualquer um solicita reserva" on public.reservas for insert to anon, authenticated with check (true);
create policy "Admin le reservas" on public.reservas for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin edita reservas" on public.reservas for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin exclui reservas" on public.reservas for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Avaliacoes
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  nota integer not null default 5,
  facilidade text not null default '',
  satisfacao text not null default '',
  "participariaNovamente" text not null default '',
  recomendaria text not null default '',
  sugestao text not null default '',
  "createdAt" timestamptz not null default now()
);

grant select, insert on public.avaliacoes to anon;
grant select, insert, update, delete on public.avaliacoes to authenticated;
grant all on public.avaliacoes to service_role;

alter table public.avaliacoes enable row level security;

create policy "Avaliacoes publicas" on public.avaliacoes for select to anon, authenticated using (true);
create policy "Qualquer um avalia" on public.avaliacoes for insert to anon, authenticated with check (nota between 1 and 5);
create policy "Admin exclui avaliacao" on public.avaliacoes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Catalogo inicial
insert into public.produtos (codigo, nome, categoria, tamanho, estado, status, troca, descricao, imagem) values
('001', 'Camisa jeans clássica', 'adulto', 'M', 'Ótimo estado', 'available', '2 peças em bom estado', 'Camisa jeans unissex, lavada e revisada pela equipe.', 'https://images.pexels.com/photos/4440566/pexels-photo-4440566.jpeg'),
('002', 'Vestido floral leve', 'adulto', 'G', 'Seminovo', 'available', '2 peças em bom estado', 'Vestido leve, ideal para dias quentes.', 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800'),
('003', 'Jaqueta de moletom', 'adulto', 'P', 'Ótimo estado', 'available', '3 peças em bom estado', 'Jaqueta confortável com bolsos laterais.', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800'),
('004', 'Conjunto infantil algodão', 'infantil', '6 anos', 'Seminovo', 'available', '2 peças infantis', 'Conjunto macio de algodão para o dia a dia.', 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'),
('005', 'Tênis casual', 'acessorios', '38', 'Bom estado', 'available', '1 par de calçados', 'Tênis higienizado, solado em bom estado.', 'https://images.pexels.com/photos/15625985/pexels-photo-15625985.jpeg'),
('006', 'Bolsa de ombro', 'acessorios', 'Único', 'Ótimo estado', 'available', '1 acessório', 'Bolsa espaçosa com alça ajustável.', 'https://images.pexels.com/photos/27204291/pexels-photo-27204291.jpeg');