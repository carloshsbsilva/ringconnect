-- Delete orphaned posts (posts without a corresponding profile)
DELETE FROM feed_posts
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Drop the existing foreign key constraint
ALTER TABLE feed_posts
DROP CONSTRAINT IF EXISTS feed_posts_user_id_fkey;

-- Add foreign key constraint pointing to profiles.id (the primary key)
ALTER TABLE feed_posts
ADD CONSTRAINT feed_posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;