
REVOKE EXECUTE ON FUNCTION public.create_group(text, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.add_group_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_my_groups() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_group(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
