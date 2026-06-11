
update public.profiles
   set community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 where email = 'ryan.c.levin@gmail.com';

create or replace function public.switch_user_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_join_mode text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select join_mode into v_join_mode from public.communities where id = p_community_id;
  if v_join_mode is null then
    raise exception 'community not found';
  end if;
  if v_join_mode <> 'auto' then
    raise exception 'community requires approval';
  end if;

  update public.profiles
     set community_id = p_community_id,
         vouched_at = coalesce(vouched_at, now())
   where id = v_uid;
end;
$$;

grant execute on function public.switch_user_community(uuid) to authenticated;
