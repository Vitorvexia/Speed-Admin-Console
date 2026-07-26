-- supabase/migrations/002_lead_models_junction.sql
-- Multiplos modelos de interesse por lead
-- Rodar no Supabase SQL Editor

CREATE TABLE lead_models (
  lead_id  uuid REFERENCES leads(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, model_id)
);

CREATE INDEX idx_lead_models_model ON lead_models(model_id);

ALTER TABLE lead_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_rw" ON lead_models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migra os dados existentes da FK única antes de dropar a coluna
INSERT INTO lead_models (lead_id, model_id)
SELECT id, interested_model FROM leads WHERE interested_model IS NOT NULL;

DROP INDEX IF EXISTS idx_leads_interested_model;

ALTER TABLE leads DROP COLUMN interested_model;
