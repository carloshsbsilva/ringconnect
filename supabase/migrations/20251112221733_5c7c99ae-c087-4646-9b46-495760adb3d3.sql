-- Inserir perfil para o usuário existente
INSERT INTO public.profiles (user_id, full_name)
SELECT '6dfd7a65-f992-477b-8fd6-06056784fc2e', 'Carlos H S B Silva'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = '6dfd7a65-f992-477b-8fd6-06056784fc2e'
);

-- Recriar o trigger para garantir que funcione
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();