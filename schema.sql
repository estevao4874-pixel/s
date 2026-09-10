-- ============================================================
-- Studio Janiquelen Alves — Schema completo (Supabase/Postgres)
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- Profissionais
CREATE TABLE IF NOT EXISTS professionals (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#EC4899',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horários individuais por profissional (sobrescreve horário geral se existir)
CREATE TABLE IF NOT EXISTS professional_hours (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  open_time TEXT,
  close_time TEXT,
  break_start TEXT,
  break_end TEXT,
  UNIQUE (professional_id, day_of_week)
);

-- Folgas / férias / bloqueios
CREATE TABLE IF NOT EXISTS blocked_slots (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT REFERENCES professionals(id) ON DELETE CASCADE,
  -- null professional_id = bloqueio de todo o salão
  date DATE NOT NULL,
  start_time TEXT, -- null = dia inteiro
  end_time TEXT,
  reason TEXT,
  kind TEXT NOT NULL DEFAULT 'block' CHECK (kind IN ('block','vacation','day_off','lunch')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços / procedimentos
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_label TEXT, -- texto livre opcional "R$ 60 a R$ 90"
  icon TEXT DEFAULT '✨',
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  buffer_minutes INT NOT NULL DEFAULT 0, -- intervalo após o serviço
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quais profissionais fazem quais serviços
CREATE TABLE IF NOT EXISTS service_professionals (
  service_id BIGINT REFERENCES services(id) ON DELETE CASCADE,
  professional_id BIGINT REFERENCES professionals(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, professional_id)
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients(whatsapp);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Agendamentos
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_whatsapp TEXT,
  service_id BIGINT NOT NULL REFERENCES services(id),
  professional_id BIGINT NOT NULL REFERENCES professionals(id),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  notes TEXT,
  cancel_reason TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','partial')),
  payment_method TEXT CHECK (payment_method IN ('pix','card','cash','other', NULL)),
  amount NUMERIC(10,2),
  google_event_id TEXT,
  source TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_date ON bookings(professional_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Lista de espera
CREATE TABLE IF NOT EXISTS waitlist (
  id BIGSERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_whatsapp TEXT,
  service_id BIGINT REFERENCES services(id),
  professional_id BIGINT REFERENCES professionals(id),
  preferred_date DATE,
  preferred_period TEXT, -- morning/afternoon
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','booked','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horário geral do salão
CREATE TABLE IF NOT EXISTS business_hours (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TEXT,
  close_time TEXT,
  break_start TEXT,
  break_end TEXT
);

-- Lembretes (fila para envio)
CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirm','reminder','cancel','reschedule','comeback')),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Config / tokens
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (senha hash)
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== SEED ==========

INSERT INTO professionals (name, color, active) VALUES
  ('Janiquelen Alves', '#EC4899', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO services (name, duration_minutes, price, price_label, icon, active) VALUES
  ('Corte', 60, 90, 'R$ 90,00', '✂️', TRUE),
  ('Escova (cabelo curto)', 30, 45, 'R$ 45,00', '💨', TRUE),
  ('Escova (cabelo médio)', 30, 55, 'R$ 55,00', '💨', TRUE),
  ('Escova (cabelo longo)', 60, 75, 'R$ 60,00 a R$ 90,00', '💨', TRUE),
  ('Sobrancelha', 30, 40, 'R$ 40,00', '✏️', TRUE),
  ('Sobrancelha + Buço', 30, 55, 'R$ 55,00', '✨', TRUE),
  ('Buço', 15, 15, 'R$ 15,00', '🤍', TRUE),
  ('Coloração (1 tubo)', 90, 150, 'R$ 150,00', '🎨', TRUE),
  ('Tonalizante', 90, 150, 'R$ 150,00', '🎨', TRUE),
  ('Coconut', 180, 175, 'R$ 100,00 a R$ 250,00', '🥥', TRUE)
ON CONFLICT DO NOTHING;

-- Todos profissionais fazem todos serviços
INSERT INTO service_professionals (service_id, professional_id)
SELECT s.id, p.id FROM services s CROSS JOIN professionals p
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end) VALUES
  (0, FALSE, NULL, NULL, NULL, NULL),
  (1, FALSE, NULL, NULL, NULL, NULL),
  (2, TRUE, '13:00', '17:00', NULL, NULL),
  (3, TRUE, '08:00', '17:00', '11:00', '13:00'),
  (4, TRUE, '08:00', '17:00', '11:00', '13:00'),
  (5, TRUE, '08:00', '17:00', '11:00', '13:00'),
  (6, TRUE, '08:00', '17:00', '11:00', '13:00')
ON CONFLICT (day_of_week) DO NOTHING;

-- Senha admin padrão 9415 (bcrypt) — será garantida pela API no primeiro uso se vazio
-- password_hash preenchido via app

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para service_role; anon pode ler serviços/pros e criar booking via API
CREATE POLICY "public read services" ON services FOR SELECT USING (active = TRUE);
CREATE POLICY "public read professionals" ON professionals FOR SELECT USING (active = TRUE);
CREATE POLICY "public read hours" ON business_hours FOR SELECT USING (TRUE);
