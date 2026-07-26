-- Añadir columna de pago de reserva a players
ALTER TABLE players ADD COLUMN IF NOT EXISTS paid_reservation BOOLEAN DEFAULT false;

-- Añadir control de abonos parciales a fees
ALTER TABLE fees ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER DEFAULT 0;

-- Crear tabla de Entregas a Cuenta (Transacciones)
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id UUID REFERENCES fees(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    payment_method TEXT,
    receipt_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Políticas RLS para fee_payments
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los admins y tesoreros pueden ver todos los pagos"
    ON fee_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'entrenador')
        )
    );

CREATE POLICY "Los usuarios pueden ver los pagos de sus cuotas"
    ON fee_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fees
            WHERE fees.id = fee_payments.fee_id
            AND fees.profile_id = auth.uid()
        )
    );

CREATE POLICY "Los admins pueden insertar pagos"
    ON fee_payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'entrenador')
        )
    );
