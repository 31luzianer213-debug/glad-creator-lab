create or replace function public.reivindicar_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ja_existe boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select exists (select 1 from public.user_roles where role = 'admin') into ja_existe;

  if ja_existe then
    return public.has_role(auth.uid(), 'admin');
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin')
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function public.reivindicar_admin() to authenticated;