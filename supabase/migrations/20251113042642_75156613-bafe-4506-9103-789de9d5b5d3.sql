-- Drop the incorrect foreign key constraint
ALTER TABLE feed_posts
DROP CONSTRAINT IF EXISTS feed_posts_user_id_fkey;

-- Add foreign key constraint pointing to profiles.user_id (the correct column)
ALTER TABLE feed_posts
ADD CONSTRAINT feed_posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;