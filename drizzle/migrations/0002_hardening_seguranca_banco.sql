-- Validacao de dados no banco (nao confia no frontend)

alter table public.produtos
  add constraint produtos_codigo_chk check (char_length(codigo) between 1 and 20),
  add constraint produtos_nome_chk check (char_length(nome) between 1 and 120),
  add constraint produtos_categoria_chk check (categoria in ('adulto','infantil','acessorios')),
  add constraint produtos_status_chk check (status in ('available','reserved','exchanged')),
  add constraint produtos_tamanho_chk check (char_length(tamanho) <= 40),
  add constraint produtos_estado_chk check (char_length(estado) <= 60),
  add constraint produtos_troca_chk check (char_length(troca) <= 200),
  add constraint produtos_descricao_chk check (char_length(descricao) <= 1000),
  add constraint produtos_imagem_chk check (
    imagem = '' or (imagem ~* '^https://' and char_length(imagem) <= 600)
  );

alter table public.reservas
  add constraint reservas_nome_chk check (char_length("nomeCompleto") between 1 and 120),
  add constraint reservas_contato_chk check (char_length(contato) between 1 and 120),
  add constraint reservas_codigo_chk check (char_length("codigoProduto") <= 20),
  add constraint reservas_produto_chk check (char_length("nomeProduto") <= 120),
  add constraint reservas_tipodoacao_chk check (char_length("tipoDoacao") <= 60),
  add constraint reservas_itemdoacao_chk check (char_length("itemDoacao") <= 300),
  add constraint reservas_quantidade_chk check (quantidade between 0 and 100),
  add constraint reservas_status_chk check (status in ('Pendente','Em análise','Confirmada','Vendido','Cancelada')),
  add constraint reservas_obs_chk check (char_length("observacoesEquipe") <= 1000);

alter table public.avaliacoes
  add constraint avaliacoes_nota_chk check (nota between 1 and 5),
  add constraint avaliacoes_facilidade_chk check (char_length(facilidade) <= 60),
  add constraint avaliacoes_satisfacao_chk check (char_length(satisfacao) <= 60),
  add constraint avaliacoes_participaria_chk check (char_length("participariaNovamente") <= 60),
  add constraint avaliacoes_recomendaria_chk check (char_length(recomendaria) <= 60),
  add constraint avaliacoes_sugestao_chk check (char_length(sugestao) <= 1000);

-- Indices para leitura rapida e paginacao
create index if not exists produtos_created_idx on public.produtos ("createdAt" desc);
create index if not exists produtos_status_idx on public.produtos (status);
create index if not exists produtos_categoria_idx on public.produtos (categoria);
create index if not exists reservas_created_idx on public.reservas ("createdAt" desc);
create index if not exists reservas_status_idx on public.reservas (status);
create index if not exists reservas_codigo_idx on public.reservas ("codigoProduto");
create index if not exists avaliacoes_created_idx on public.avaliacoes ("createdAt" desc);
create index if not exists user_roles_user_idx on public.user_roles (user_id);

-- Somente conta com e-mail confirmado pode reivindicar a administracao
create or replace function public.reivindicar_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ja_existe boolean;
  confirmado timestamptz;
begin
  if auth.uid() is null then
    return false;
  end if;

  select exists (select 1 from public.user_roles where role = 'admin') into ja_existe;

  if ja_existe then
    return public.has_role(auth.uid(), 'admin');
  end if;

  select email_confirmed_at into confirmado from auth.users where id = auth.uid();
  if confirmado is null then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin')
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.reivindicar_admin() from public, anon;
grant execute on function public.reivindicar_admin() to authenticated;

-- Ninguem pode conceder papeis pelo app: apenas a funcao acima (security definer)
revoke insert, update, delete on public.user_roles from authenticated;