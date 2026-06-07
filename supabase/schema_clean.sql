CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','coordinador','agente','asegurado')),
  status        TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('activo','bloqueado','pendiente','suspendido')),
  company_id    UUID,
  client_id     UUID,
  phone         TEXT,
  avatar_url    TEXT,
  pin_hash      TEXT,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_at     TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  invite_token  TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE biometric_credentials (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id  TEXT UNIQUE NOT NULL,
  public_key     TEXT NOT NULL,
  counter        BIGINT NOT NULL DEFAULT 0,
  device_name    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  logo_url         TEXT,
  brand_color      TEXT DEFAULT '#003D5C',
  assistance_phone TEXT,
  website          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   TEXT NOT NULL,
  dni         TEXT UNIQUE NOT NULL,
  birth_date  DATE,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES companies(id),
  display_name   TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('auto','hogar','vida','ahorro','art','comercio')),
  policy_number  TEXT NOT NULL,
  coverage       TEXT,
  premium_cents  BIGINT DEFAULT 0,
  currency       TEXT DEFAULT 'ARS',
  starts_at      DATE,
  expires_at     DATE,
  status         TEXT DEFAULT 'activo' CHECK (status IN ('activo','vencido','cancelado')),
  plate          TEXT,
  brand          TEXT,
  model          TEXT,
  year_vehicle   INT,
  vin            TEXT,
  engine_no      TEXT,
  property_address TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  company_id      UUID NOT NULL REFERENCES companies(id),
  type            TEXT NOT NULL CHECK (type IN ('poliza','circulacion','mercosur','cuota','cedula','otro')),
  display_name    TEXT NOT NULL,
  period          TEXT NOT NULL,
  year            INT NOT NULL,
  file_url        TEXT NOT NULL,
  onedrive_url    TEXT,
  onedrive_path   TEXT,
  file_size       BIGINT,
  mime_type       TEXT DEFAULT 'application/pdf',
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id       UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id),
  company_id    UUID NOT NULL REFERENCES companies(id),
  period        TEXT NOT NULL,
  amount_cents  BIGINT NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'ARS',
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMPTZ,
  status        TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagado','vencido')),
  method        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('vencimiento','pago_pendiente','pago_vencido','documento_nuevo','cumpleanos','sistema')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  ref_id      UUID,
  read_at     TIMESTAMPTZ,
  sent_push   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id),
  created_by   UUID REFERENCES users(id),
  client_name  TEXT,
  client_phone TEXT,
  brand        TEXT,
  model        TEXT,
  year         INT,
  plate        TEXT,
  coverage     TEXT,
  amount_cents BIGINT,
  currency     TEXT DEFAULT 'ARS',
  valid_until  DATE,
  status       TEXT DEFAULT 'borrador' CHECK (status IN ('borrador','enviada','aceptada','rechazada')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes              ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_company()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_client()
RETURNS UUID AS $$
  SELECT client_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "users_admin_all" ON users FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "users_self" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "companies_staff" ON companies FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "companies_agent_read" ON companies FOR SELECT USING (get_user_role() = 'agente');
CREATE POLICY "companies_client_read" ON companies FOR SELECT USING (get_user_role() = 'asegurado');
CREATE POLICY "clients_admin_all" ON clients FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "clients_agent_company" ON clients FOR SELECT USING (get_user_role() = 'agente' AND EXISTS (SELECT 1 FROM risks r WHERE r.client_id = clients.id AND r.company_id = get_user_company()));
CREATE POLICY "clients_self" ON clients FOR SELECT USING (id = get_user_client());
CREATE POLICY "risks_admin_all" ON risks FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "risks_agent_company" ON risks FOR ALL USING (get_user_role() = 'agente' AND company_id = get_user_company());
CREATE POLICY "risks_client_self" ON risks FOR SELECT USING (get_user_role() = 'asegurado' AND client_id = get_user_client());
CREATE POLICY "docs_admin_all" ON documents FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "docs_agent_company" ON documents FOR ALL USING (get_user_role() = 'agente' AND company_id = get_user_company());
CREATE POLICY "docs_client_self" ON documents FOR SELECT USING (get_user_role() = 'asegurado' AND client_id = get_user_client());
CREATE POLICY "payments_admin_all" ON payments FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "payments_agent_company" ON payments FOR ALL USING (get_user_role() = 'agente' AND company_id = get_user_company());
CREATE POLICY "payments_client_self" ON payments FOR SELECT USING (get_user_role() = 'asegurado' AND client_id = get_user_client());
CREATE POLICY "alerts_own" ON alerts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "alerts_admin_all" ON alerts FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL USING (user_id = auth.uid());
CREATE POLICY "audit_admin_only" ON audit_logs FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "quotes_admin_all" ON quotes FOR ALL USING (get_user_role() IN ('admin','coordinador'));
CREATE POLICY "quotes_agent_company" ON quotes FOR ALL USING (get_user_role() = 'agente' AND company_id = get_user_company());

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false), ('avatars', 'avatars', true);

CREATE POLICY "storage_documents_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','coordinador','agente'));
CREATE POLICY "storage_documents_read" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE INDEX idx_risks_client     ON risks(client_id);
CREATE INDEX idx_risks_company    ON risks(company_id);
CREATE INDEX idx_risks_expires    ON risks(expires_at);
CREATE INDEX idx_risks_status     ON risks(status);
CREATE INDEX idx_documents_risk   ON documents(risk_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_year   ON documents(year);
CREATE INDEX idx_payments_risk    ON payments(risk_id);
CREATE INDEX idx_payments_status  ON payments(status);
CREATE INDEX idx_payments_due     ON payments(due_date);
CREATE INDEX idx_alerts_user      ON alerts(user_id);
CREATE INDEX idx_alerts_read      ON alerts(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_clients_birth    ON clients(EXTRACT(MONTH FROM birth_date));
CREATE INDEX idx_audit_user       ON audit_logs(user_id);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);
