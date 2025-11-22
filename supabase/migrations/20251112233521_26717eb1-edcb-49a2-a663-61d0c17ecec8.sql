-- Add gym_id to training_logs to track where training happened
ALTER TABLE training_logs ADD COLUMN gym_id uuid REFERENCES gyms(id);

-- Add pricing information to gyms table
ALTER TABLE gyms ADD COLUMN monthly_fee numeric;
ALTER TABLE gyms ADD COLUMN private_class_fee numeric;

-- Create chat_messages table for athlete-gym communication
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  gym_id uuid REFERENCES gyms(id),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their own messages"
ON chat_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Users can mark messages as read"
ON chat_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Add realtime support for chat messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;