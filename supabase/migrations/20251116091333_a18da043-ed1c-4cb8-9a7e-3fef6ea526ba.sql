-- 1. Adicionar training_date em training_logs
ALTER TABLE training_logs
  ADD COLUMN IF NOT EXISTS training_date date DEFAULT CURRENT_DATE;

-- 2. Adicionar parent_comment_id para threads em post_comments
ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE;

-- 3. Criar tabela comment_mentions para @menções
CREATE TABLE IF NOT EXISTS comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on comment_mentions
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view mentions
CREATE POLICY "Anyone can view mentions"
ON comment_mentions FOR SELECT
USING (true);

-- Policy: Users can create mentions
CREATE POLICY "Users can create mentions"
ON comment_mentions FOR INSERT
WITH CHECK (true);

-- 4. Adicionar shared_from_post_id para compartilhamentos (Round)
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS shared_from_post_id uuid REFERENCES feed_posts(id) ON DELETE SET NULL;

-- 5. Trigger para notificar compartilhamentos
CREATE OR REPLACE FUNCTION notify_post_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original_author_id uuid;
  sharer_name text;
BEGIN
  -- Get original post author
  IF NEW.shared_from_post_id IS NOT NULL THEN
    SELECT user_id INTO original_author_id FROM feed_posts WHERE id = NEW.shared_from_post_id;
    
    -- Don't notify if user shares their own post
    IF original_author_id = NEW.user_id THEN
      RETURN NEW;
    END IF;
    
    -- Get sharer name
    SELECT full_name INTO sharer_name FROM profiles WHERE user_id = NEW.user_id;
    
    INSERT INTO notifications (user_id, type, content, related_user_id, related_post_id)
    VALUES (
      original_author_id,
      'share',
      '🔁 ' || sharer_name || ' compartilhou seu round',
      NEW.user_id,
      NEW.shared_from_post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for shares
DROP TRIGGER IF EXISTS on_post_share ON feed_posts;
CREATE TRIGGER on_post_share
  AFTER INSERT ON feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_share();

-- 6. Trigger para notificar menções
CREATE OR REPLACE FUNCTION notify_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_author_name text;
  post_id_ref uuid;
BEGIN
  -- Get comment author name
  SELECT full_name INTO comment_author_name 
  FROM profiles 
  WHERE user_id = (SELECT user_id FROM post_comments WHERE id = NEW.comment_id);
  
  -- Get post id
  SELECT post_id INTO post_id_ref FROM post_comments WHERE id = NEW.comment_id;
  
  INSERT INTO notifications (user_id, type, content, related_user_id, related_post_id)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    '💬 ' || comment_author_name || ' mencionou você em um comentário',
    (SELECT user_id FROM post_comments WHERE id = NEW.comment_id),
    post_id_ref
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for mentions
DROP TRIGGER IF EXISTS on_comment_mention ON comment_mentions;
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_mention();