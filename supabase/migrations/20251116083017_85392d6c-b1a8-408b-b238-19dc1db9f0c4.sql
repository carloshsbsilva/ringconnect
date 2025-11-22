-- Migração idempotente: feed_posts e training_logs

-- 1) Adicionar colunas em feed_posts (se não existirem)
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_preview jsonb,
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Remover constraint antigo se existir
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_media_type_check;

-- Adicionar constraint atualizado
ALTER TABLE feed_posts 
  ADD CONSTRAINT feed_posts_media_type_check 
  CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'link'));

-- 2) Criar função de validação de post não-vazio
CREATE OR REPLACE FUNCTION validate_feed_post_not_empty()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS trg_feed_post_not_empty ON feed_posts;
CREATE TRIGGER trg_feed_post_not_empty
  BEFORE INSERT OR UPDATE ON feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_feed_post_not_empty();

-- 3) Adicionar coluna did_sparring_light em training_logs
ALTER TABLE training_logs
  ADD COLUMN IF NOT EXISTS did_sparring_light boolean DEFAULT false;

-- 4) Criar bucket para mídias de posts (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  209715200, -- 200MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 5) Políticas RLS para bucket post-media
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own post media" ON storage.objects;
CREATE POLICY "Users can update their own post media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;
CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );