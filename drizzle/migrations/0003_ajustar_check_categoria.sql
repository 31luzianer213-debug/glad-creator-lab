alter table public.produtos drop constraint produtos_categoria_chk;

alter table public.produtos
  add constraint produtos_categoria_chk check (
    categoria in ('adulto','infantil','acessorios','adult','children','shoes')
  );