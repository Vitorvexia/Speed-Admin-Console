-- supabase/migrations/003_lead_instagram.sql
-- Campo Instagram como contato alternativo ao WhatsApp
-- Rodar no Supabase SQL Editor

ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram text;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_required;
ALTER TABLE leads ADD CONSTRAINT leads_contact_required
  CHECK (phone IS NOT NULL OR instagram IS NOT NULL);
