create or replace function public.reivindicar_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then
    return false;
  end if;

  if public.has_role(uid, 'admin') then
    return true;
  end if;

  select u.email into mail
  from auth.users u
  where u.id = uid and u.email_confirmed_at is not null;

  if mail is null or lower(mail) <> 'luzianer213@gmail.com' then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (uid, 'admin')
  on conflict (user_id, role) do nothing;

  return true;
end;
$$;

revoke execute on function public.reivindicar_admin() from public, anon;
grant execute on function public.reivindicar_admin() to authenticated;