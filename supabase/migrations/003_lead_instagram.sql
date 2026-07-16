-- supabase/migrations/003_lead_instagram.sql
-- Campo Instagram como contato alternativo ao WhatsApp
-- Rodar no Supabase SQL Editor

ALTER TABLE leads ADD COLUMN instagram text;

ALTER TABLE leads ADD CONSTRAINT leads_contact_required
  CHECK (phone IS NOT NULL OR instagram IS NOT NULL);
