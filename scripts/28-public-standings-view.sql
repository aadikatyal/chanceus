-- Public display names for the standings page.
-- Exposes username, display name, and gamertag only. Email and token balance stay on public.users.

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, username, display_name, gamertag
FROM public.users;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
