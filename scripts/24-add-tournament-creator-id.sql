-- Add creator_id to tournaments so creators can start without registering
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.users(id);
