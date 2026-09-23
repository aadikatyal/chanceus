-- Allow first-time profile row when OAuth trigger did not run (local / legacy DBs).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
