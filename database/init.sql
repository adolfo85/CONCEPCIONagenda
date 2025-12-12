-- Script de inicialización de la base de datos para OrtotTrack Pro
-- Ejecuta este script en tu consola de Neon si aún no has creado las tablas

-- 1. Tabla de Profesionales (Dentists)
CREATE TABLE IF NOT EXISTS dentists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Pacientes (Patients)
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    dentist_id TEXT NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    start_date DATE NOT NULL,
    installation_total NUMERIC(10, 2) DEFAULT 0,
    installation_debit NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Registros Clínicos (Clinical Records)
CREATE TABLE IF NOT EXISTS clinical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    record_type TEXT DEFAULT 'control', -- 'control' or 'consultation'
    
    -- Campos de Ortodoncia
    upper_arch TEXT,
    lower_arch TEXT,
    upper_months NUMERIC(4, 1),
    lower_months NUMERIC(4, 1),
    months_active NUMERIC(4, 1), -- Campo legacy para compatibilidad
    
    -- Campos de Odontología General
    service_type TEXT,
    tooth_numbers JSONB,  -- Guardaremos el array de piezas como JSON: ["11", "12"]
    tooth_surfaces JSONB, -- Legacy: ["Ocl", "V"]
    tooth_details JSONB,  -- Nuevo formato detallado: [{"number": "11", "surfaces": ["M", "D"]}]
    
    -- Campos Comunes
    notes TEXT,
    payment_amount NUMERIC(10, 2) DEFAULT 0,
    installation_payment NUMERIC(10, 2) DEFAULT 0,
    debit_amount NUMERIC(10, 2) DEFAULT 0,
    is_installation BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Agenda / Turnos (Appointments)
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    dentist_id TEXT NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL, -- Formato HH:mm
    duration INTEGER NOT NULL, -- Duración en minutos
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Prestaciones (Service Types)
CREATE TABLE IF NOT EXISTS service_types (
    name TEXT PRIMARY KEY
);

-- Insertar las prestaciones por defecto
INSERT INTO service_types (name) VALUES 
('Consulta'),
('Restauración simple'),
('Restauración compuesta'),
('Extracción'),
('Sesión de tratamiento de conducto'),
('Implante')
ON CONFLICT (name) DO NOTHING;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_patients_dentist ON patients(dentist_id);
CREATE INDEX IF NOT EXISTS idx_records_patient ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
