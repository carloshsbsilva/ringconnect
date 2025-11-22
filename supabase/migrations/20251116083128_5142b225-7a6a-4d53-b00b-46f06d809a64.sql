-- Corrigir search_path na função de validação
CREATE OR REPLACE FUNCTION validate_feed_post_not_empty()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se pelo menos um dos campos está preenchido
  IF COALESCE(NULLIF(TRIM(NEW.caption), ''), NULL) IS NULL
     AND COALESCE(NULLIF(TRIM(NEW.media_url), ''), NULL) IS NULL
     AND COALESCE(NULLIF(TRIM(NEW.link_url), ''), NULL) IS NULL
     AND COALESCE(NULLIF(TRIM(NEW.content), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Post vazio: informe legenda, mídia ou link.';
  END IF;
  RETURN NEW;
END;
$$;