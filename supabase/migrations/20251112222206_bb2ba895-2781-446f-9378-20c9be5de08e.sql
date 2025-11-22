-- Adicionar novos campos ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS gym_name TEXT,
ADD COLUMN IF NOT EXISTS gym_address TEXT,
ADD COLUMN IF NOT EXISTS gym_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS gym_longitude NUMERIC;

-- Criar tabela de logs de treino
CREATE TABLE IF NOT EXISTS public.training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_hours NUMERIC NOT NULL,
  did_sparring BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Habilitar RLS
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para training_logs
CREATE POLICY "Users can view their own training logs"
  ON public.training_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training logs"
  ON public.training_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training logs"
  ON public.training_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training logs"
  ON public.training_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_training_logs_updated_at
  BEFORE UPDATE ON public.training_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular categoria de peso
CREATE OR REPLACE FUNCTION public.get_weight_category(weight_kg NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF weight_kg IS NULL THEN
    RETURN NULL;
  ELSIF weight_kg <= 48 THEN
    RETURN 'Peso Mínimo (até 48kg)';
  ELSIF weight_kg <= 51 THEN
    RETURN 'Peso Mosca Ligeiro (48-51kg)';
  ELSIF weight_kg <= 54 THEN
    RETURN 'Peso Mosca (51-54kg)';
  ELSIF weight_kg <= 57 THEN
    RETURN 'Peso Galo (54-57kg)';
  ELSIF weight_kg <= 60 THEN
    RETURN 'Peso Pena (57-60kg)';
  ELSIF weight_kg <= 63.5 THEN
    RETURN 'Peso Leve (60-63.5kg)';
  ELSIF weight_kg <= 67 THEN
    RETURN 'Peso Super Leve (63.5-67kg)';
  ELSIF weight_kg <= 71 THEN
    RETURN 'Peso Meio-Médio (67-71kg)';
  ELSIF weight_kg <= 75 THEN
    RETURN 'Peso Médio (71-75kg)';
  ELSIF weight_kg <= 81 THEN
    RETURN 'Peso Meio-Pesado (75-81kg)';
  ELSIF weight_kg <= 91 THEN
    RETURN 'Peso Cruzador (81-91kg)';
  ELSE
    RETURN 'Peso Pesado (+91kg)';
  END IF;
END;
$$;