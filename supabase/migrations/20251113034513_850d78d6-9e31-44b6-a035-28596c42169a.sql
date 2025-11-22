-- Drop the existing check constraint if it exists
ALTER TABLE feed_posts
DROP CONSTRAINT IF EXISTS feed_posts_post_type_check;

-- Add updated check constraint to allow both 'training' and 'post' types
ALTER TABLE feed_posts
ADD CONSTRAINT feed_posts_post_type_check 
CHECK (post_type IN ('training', 'post'));