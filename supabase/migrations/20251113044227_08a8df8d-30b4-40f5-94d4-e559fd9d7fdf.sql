-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view comment likes"
ON public.comment_likes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like comments"
ON public.comment_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
ON public.comment_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create notification function for comment likes
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_owner_id uuid;
  liker_name text;
BEGIN
  -- Get comment owner
  SELECT user_id INTO comment_owner_id FROM post_comments WHERE id = NEW.comment_id;
  
  -- Don't notify if user likes their own comment
  IF comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker name
  SELECT full_name INTO liker_name FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, content, related_user_id, related_post_id)
  VALUES (
    comment_owner_id,
    'comment_like',
    liker_name || ' curtiu seu comentário',
    NEW.user_id,
    (SELECT post_id FROM post_comments WHERE id = NEW.comment_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment like notifications
CREATE TRIGGER notify_on_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_like();

-- Add indexes for better performance
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);