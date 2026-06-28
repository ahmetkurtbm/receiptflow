CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_type_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_receipt_type_groups (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES receipt_type_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES receipt_type_groups(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL DEFAULT 'Fis',
  file_name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  total_amount NUMERIC(18, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS receipts_user_created_idx ON receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_group_idx ON receipts(group_id);
CREATE INDEX IF NOT EXISTS receipts_analysis_gin_idx ON receipts USING GIN(analysis);

INSERT INTO receipt_type_groups(code, name, description)
VALUES
  ('GENEL', 'Genel Masraflar', 'Varsayilan masraf ve fis grubu'),
  ('SEYAHAT', 'Seyahat', 'Ulasim, konaklama ve seyahat giderleri'),
  ('OFIS', 'Ofis', 'Kirtasiye, ekipman ve ofis giderleri')
ON CONFLICT (code) DO NOTHING;
