-- Migración: Registro Oficial de Recibos y Numeración Correlativa Ininterrumpida
CREATE TABLE IF NOT EXISTS official_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    fee_id UUID REFERENCES fees(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES fee_payments(id) ON DELETE SET NULL,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    series_prefix TEXT DEFAULT 'REC',
    year INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    concept TEXT NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'emitido', -- 'emitido' | 'anulado'
    pdf_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índice único por club, año y número correlativo
CREATE UNIQUE INDEX IF NOT EXISTS idx_official_receipts_unique_number 
ON official_receipts(club_id, receipt_number);

-- RLS
ALTER TABLE official_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los admins y directivos ven todos los recibos"
    ON official_receipts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coordinador', 'directivo')
        )
    );

CREATE POLICY "Los usuarios ven los recibos de sus jugadores"
    ON official_receipts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM players
            WHERE players.id = official_receipts.player_id
            AND players.tutor_id = auth.uid()
        )
    );

CREATE POLICY "Los admins pueden insertar y actualizar recibos"
    ON official_receipts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coordinador', 'directivo')
        )
    );
