-- Create championships table for athletes
CREATE TABLE public.championships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  championship_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_champion BOOLEAN NOT NULL DEFAULT false,
  position INTEGER,
  opponent_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view championships"
ON public.championships
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own championships"
ON public.championships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own championships"
ON public.championships
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own championships"
ON public.championships
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_championships_updated_at
BEFORE UPDATE ON public.championships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_championships_user_id ON public.championships(user_id);
CREATE INDEX idx_championships_year ON public.championships(year DESC);