-- Update get_weight_category function with official boxing categories and add gender support
CREATE OR REPLACE FUNCTION public.get_weight_category(weight_kg numeric, gender text DEFAULT 'male')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF weight_kg IS NULL THEN
    RETURN NULL;
  END IF;

  -- Female categories include Atomweight
  IF gender = 'female' THEN
    IF weight_kg <= 45.359 THEN
      RETURN 'Peso Átomo (até 45.4kg)';
    ELSIF weight_kg <= 47.627 THEN
      RETURN 'Peso Palha (até 47.6kg)';
    ELSIF weight_kg <= 48.988 THEN
      RETURN 'Peso Mosca Ligeiro (até 49kg)';
    ELSIF weight_kg <= 50.802 THEN
      RETURN 'Peso Mosca (até 50.8kg)';
    ELSIF weight_kg <= 52.163 THEN
      RETURN 'Peso Super Mosca (até 52.2kg)';
    ELSIF weight_kg <= 53.525 THEN
      RETURN 'Peso Galo (até 53.5kg)';
    ELSIF weight_kg <= 55.225 THEN
      RETURN 'Peso Super Galo (até 55.2kg)';
    ELSIF weight_kg <= 57.153 THEN
      RETURN 'Peso Pena (até 57.2kg)';
    ELSIF weight_kg <= 58.967 THEN
      RETURN 'Peso Super Pena (até 59kg)';
    ELSIF weight_kg <= 61.235 THEN
      RETURN 'Peso Leve (até 61.2kg)';
    ELSIF weight_kg <= 63.503 THEN
      RETURN 'Peso Super Leve (até 63.5kg)';
    ELSIF weight_kg <= 66.678 THEN
      RETURN 'Peso Meio-Médio (até 66.7kg)';
    ELSIF weight_kg <= 69.853 THEN
      RETURN 'Peso Super Meio-Médio (até 69.9kg)';
    ELSIF weight_kg <= 72.574 THEN
      RETURN 'Peso Médio (até 72.6kg)';
    ELSIF weight_kg <= 76.203 THEN
      RETURN 'Peso Super Médio (até 76.2kg)';
    ELSIF weight_kg <= 79.378 THEN
      RETURN 'Peso Meio-Pesado (até 79.4kg)';
    ELSIF weight_kg <= 90.718 THEN
      RETURN 'Peso Cruzador (até 90.7kg)';
    ELSE
      RETURN 'Peso Pesado (+90.7kg)';
    END IF;
  ELSE
    -- Male categories (no Atomweight)
    IF weight_kg <= 47.627 THEN
      RETURN 'Peso Palha (até 47.6kg)';
    ELSIF weight_kg <= 48.988 THEN
      RETURN 'Peso Mosca Ligeiro (até 49kg)';
    ELSIF weight_kg <= 50.802 THEN
      RETURN 'Peso Mosca (até 50.8kg)';
    ELSIF weight_kg <= 52.163 THEN
      RETURN 'Peso Super Mosca (até 52.2kg)';
    ELSIF weight_kg <= 53.525 THEN
      RETURN 'Peso Galo (até 53.5kg)';
    ELSIF weight_kg <= 55.225 THEN
      RETURN 'Peso Super Galo (até 55.2kg)';
    ELSIF weight_kg <= 57.153 THEN
      RETURN 'Peso Pena (até 57.2kg)';
    ELSIF weight_kg <= 58.967 THEN
      RETURN 'Peso Super Pena (até 59kg)';
    ELSIF weight_kg <= 61.235 THEN
      RETURN 'Peso Leve (até 61.2kg)';
    ELSIF weight_kg <= 63.503 THEN
      RETURN 'Peso Super Leve (até 63.5kg)';
    ELSIF weight_kg <= 66.678 THEN
      RETURN 'Peso Meio-Médio (até 66.7kg)';
    ELSIF weight_kg <= 69.853 THEN
      RETURN 'Peso Super Meio-Médio (até 69.9kg)';
    ELSIF weight_kg <= 72.574 THEN
      RETURN 'Peso Médio (até 72.6kg)';
    ELSIF weight_kg <= 76.203 THEN
      RETURN 'Peso Super Médio (até 76.2kg)';
    ELSIF weight_kg <= 79.378 THEN
      RETURN 'Peso Meio-Pesado (até 79.4kg)';
    ELSIF weight_kg <= 90.718 THEN
      RETURN 'Peso Cruzador (até 90.7kg)';
    ELSE
      RETURN 'Peso Pesado (+90.7kg)';
    END IF;
  END IF;
END;
$$;

-- Add gender field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- Create gyms table for gym/club profiles
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  address text,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gyms"
  ON public.gyms FOR SELECT
  USING (true);

CREATE POLICY "Coaches can create gyms"
  ON public.gyms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Gym owners can update their gyms"
  ON public.gyms FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Gym owners can delete their gyms"
  ON public.gyms FOR DELETE
  USING (auth.uid() = owner_id);

-- Create gym members table (athletes who train at the gym)
CREATE TABLE IF NOT EXISTS public.gym_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gym members"
  ON public.gym_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join gyms"
  ON public.gym_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave gyms"
  ON public.gym_members FOR DELETE
  USING (auth.uid() = user_id);

-- Create gym followers table (users who follow the gym)
CREATE TABLE IF NOT EXISTS public.gym_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gym followers"
  ON public.gym_followers FOR SELECT
  USING (true);

CREATE POLICY "Users can follow gyms"
  ON public.gym_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow gyms"
  ON public.gym_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Create feed posts table
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('training', 'gym_update', 'general')),
  content text NOT NULL,
  training_duration numeric,
  did_sparring boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feed posts"
  ON public.feed_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.feed_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.feed_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for gyms updated_at
CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gym_members_gym_id ON public.gym_members(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_followers_gym_id ON public.gym_followers(gym_id);