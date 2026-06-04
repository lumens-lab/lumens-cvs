
-- =========================
-- GROUPS
-- =========================
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  avatar_url text,
  owner_id uuid NOT NULL,
  last_preview text,
  last_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS group_members_user_idx ON public.group_members(user_id);

-- SECURITY DEFINER helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id AND role IN ('owner','admin'));
$$;

-- groups policies
CREATE POLICY "groups member read" ON public.groups
  FOR SELECT TO authenticated USING (public.is_group_member(id, auth.uid()));
CREATE POLICY "groups any insert" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "groups admin update" ON public.groups
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(id, auth.uid()))
  WITH CHECK (public.is_group_admin(id, auth.uid()));
CREATE POLICY "groups owner delete" ON public.groups
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- group_members policies
CREATE POLICY "gm member read" ON public.group_members
  FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gm admin insert" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    OR (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()))
  );
CREATE POLICY "gm admin delete" ON public.group_members
  FOR DELETE TO authenticated USING (
    public.is_group_admin(group_id, auth.uid()) OR auth.uid() = user_id
  );
CREATE POLICY "gm admin update" ON public.group_members
  FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- =========================
-- MESSAGES: add group_id
-- =========================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.messages ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_target_chk
  CHECK ((group_id IS NOT NULL) OR (recipient_id IS NOT NULL AND conversation_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS messages_group_idx ON public.messages(group_id, created_at);

-- Extend RLS on messages to allow group members to read/insert
DROP POLICY IF EXISTS "msg party read" ON public.messages;
CREATE POLICY "msg party read" ON public.messages
  FOR SELECT TO authenticated USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

DROP POLICY IF EXISTS "msg sender insert" ON public.messages;
CREATE POLICY "msg sender insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND (
      (group_id IS NULL AND recipient_id IS NOT NULL)
      OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    )
  );

-- =========================
-- RPCs
-- =========================
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  gid uuid;
  uid uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;

  INSERT INTO public.groups (name, owner_id) VALUES (trim(p_name), caller) RETURNING id INTO gid;
  INSERT INTO public.group_members (group_id, user_id, role) VALUES (gid, caller, 'owner');

  IF p_member_ids IS NOT NULL THEN
    FOREACH uid IN ARRAY p_member_ids LOOP
      IF uid IS NOT NULL AND uid <> caller THEN
        -- only allow confirmed contacts of caller
        IF EXISTS (SELECT 1 FROM public.contacts WHERE user_id = caller AND contact_user_id = uid AND confirmed = true) THEN
          INSERT INTO public.group_members (group_id, user_id, role) VALUES (gid, uid, 'member')
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN gid;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_group_member(p_group_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_group_admin(p_group_id, caller) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE user_id = caller AND contact_user_id = p_user_id AND confirmed = true) THEN
    RAISE EXCEPTION 'must be a confirmed contact';
  END IF;
  INSERT INTO public.group_members (group_id, user_id, role) VALUES (p_group_id, p_user_id, 'member')
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_group_member(p_group_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.is_group_admin(p_group_id, caller) OR caller = p_user_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_groups()
RETURNS TABLE(id uuid, name text, avatar_url text, owner_id uuid, last_preview text, last_at timestamptz, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.avatar_url, g.owner_id, g.last_preview, g.last_at,
    (SELECT count(*) FROM public.group_members m WHERE m.group_id = g.id) AS member_count
  FROM public.groups g
  WHERE EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = g.id AND m.user_id = auth.uid())
  ORDER BY g.last_at DESC;
$$;

-- updated_at trigger on groups
DROP TRIGGER IF EXISTS groups_touch_updated_at ON public.groups;
CREATE TRIGGER groups_touch_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
