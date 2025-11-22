-- Remove a constraint única de user_id + date para permitir múltiplos treinos por dia
ALTER TABLE training_logs DROP CONSTRAINT IF EXISTS training_logs_user_id_date_key;

-- Criar um índice para manter performance nas buscas
CREATE INDEX IF NOT EXISTS idx_training_logs_user_date ON training_logs(user_id, training_date);