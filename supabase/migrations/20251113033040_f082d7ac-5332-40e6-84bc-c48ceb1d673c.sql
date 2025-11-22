-- Extend feed_posts table to support images, videos, and links
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS link_url text;

-- Create sparring_requests table
CREATE TABLE IF NOT EXISTS sparring_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requested_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined'))
);

ALTER TABLE sparring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sparring requests"
  ON sparring_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create sparring requests"
  ON sparring_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update requests they received"
  ON sparring_requests FOR UPDATE
  USING (auth.uid() = requested_id);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id),
  CONSTRAINT valid_reaction CHECK (reaction_type IN ('fire', 'glove', 'trophy', 'target', 'strong'))
);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  related_user_id uuid,
  related_post_id uuid,
  related_sparring_id uuid,
  CONSTRAINT valid_type CHECK (type IN ('reaction', 'comment', 'share', 'sparring_request', 'other'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for sparring requests notifications
CREATE OR REPLACE FUNCTION notify_sparring_request()
RETURNS trigger AS $$
BEGIN
  INSERT INTO notifications (user_id, type, content, related_user_id, related_sparring_id)
  SELECT 
    NEW.requested_id,
    'sparring_request',
    (SELECT full_name FROM profiles WHERE user_id = NEW.requester_id) || ' solicitou um sparring com você',
    NEW.requester_id,
    NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_sparring_request_created
  AFTER INSERT ON sparring_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_sparring_request();

-- Create trigger for post reactions notifications
CREATE OR REPLACE FUNCTION notify_post_reaction()
RETURNS trigger AS $$
DECLARE
  post_owner_id uuid;
  reactor_name text;
  reaction_text text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM feed_posts WHERE id = NEW.post_id;
  
  -- Don't notify if user reacts to their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get reactor name
  SELECT full_name INTO reactor_name FROM profiles WHERE user_id = NEW.user_id;
  
  -- Map reaction type to text
  reaction_text := CASE NEW.reaction_type
    WHEN 'fire' THEN 'foi à loucura com'
    WHEN 'glove' THEN 'deu uma luva em'
    WHEN 'trophy' THEN 'premiou'
    WHEN 'target' THEN 'mirou em'
    WHEN 'strong' THEN 'se inspirou com'
  END;
  
  INSERT INTO notifications (user_id, type, content, related_user_id, related_post_id)
  VALUES (
    post_owner_id,
    'reaction',
    '🔥 ' || reactor_name || ' ' || reaction_text || ' seu treino',
    NEW.user_id,
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_post_reaction_created
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_reaction();

-- Add updated_at trigger for sparring_requests
CREATE TRIGGER update_sparring_requests_updated_at
  BEFORE UPDATE ON sparring_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();