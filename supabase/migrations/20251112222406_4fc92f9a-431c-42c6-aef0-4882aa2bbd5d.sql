-- Corrigir função com search_path seguro
CREATE OR REPLACE FUNCTION public.get_weight_category(weight_kg NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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