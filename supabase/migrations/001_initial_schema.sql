-- SpeedConsole — schema inicial
-- Rodar no Supabase SQL Editor

-- Extensão para updated_at automático
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- ================================================================
-- TABELAS
-- ================================================================

CREATE TABLE models (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  phone             text,
  email             text,
  interested_model  uuid REFERENCES models(id) NOT NULL,
  status            text DEFAULT 'novo'
                    CHECK (status IN ('novo', 'em_contato', 'convertido', 'perdido')),
  notes             text,
  last_contacted_at timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE inventory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id   uuid REFERENCES models(id) NOT NULL,
  brand      text NOT NULL,
  year       int,
  color      text,
  mileage_km int,
  price      numeric,
  status     text DEFAULT 'disponivel'
             CHECK (status IN ('disponivel', 'reservado', 'vendido')),
  notes      text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  content_idea   text,
  scheduled_date date,
  status         text DEFAULT 'ideia'
                 CHECK (status IN ('ideia', 'planejado', 'publicado')),
  created_at     timestamptz DEFAULT now()
);

-- ================================================================
-- ÍNDICES
-- ================================================================

CREATE INDEX idx_leads_interested_model ON leads(interested_model);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_inventory_created_at ON inventory(created_at DESC);
CREATE INDEX idx_posts_status_date ON posts(status, scheduled_date);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE models    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_rw" ON models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_rw" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_rw" ON inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_rw" ON posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- SEED — modelos comuns
-- ================================================================

INSERT INTO models (name) VALUES
  ('Honda Titan 160'),
  ('Honda CG 160'),
  ('Honda CB 300'),
  ('Honda Pop 110'),
  ('Honda Biz 110'),
  ('Yamaha Factor 150'),
  ('Yamaha YBR 150'),
  ('Yamaha Fazer 250'),
  ('Yamaha MT-03'),
  ('Shineray Phoenix 50');
