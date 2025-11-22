-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'athlete')
  );
  RETURN NEW;
END;
$$;