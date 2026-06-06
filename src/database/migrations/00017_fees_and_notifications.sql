-- 00017_fees_and_notifications.sql
-- Migration: create fees table and related RLS policies

-- ------------------------------------------------------------
-- Table: public.fees
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id),
    family_id uuid REFERENCES public.families(id),
    concept text NOT NULL,
    amount_cents integer NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    status varchar(20) NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
    payment_date timestamptz,
    charge_type varchar(20) NOT NULL CHECK (charge_type IN ('one_time', 'subscription')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fees_family_id ON public.fees(family_id);
CREATE INDEX IF NOT EXISTS idx_fees_match_id ON public.fees(match_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON public.fees(status);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- Admin role (assume role "authenticated" with claim "role" = 'admin')
CREATE POLICY fees_admin_all ON public.fees
    FOR ALL
    USING (auth.role() = 'admin')
    WITH CHECK (auth.role() = 'admin');

-- Family role – can read their own rows and insert pending fees for themselves
CREATE POLICY fees_family_select ON public.fees
    FOR SELECT
    USING (auth.role() = 'family' AND family_id = auth.uid());

CREATE POLICY fees_family_insert ON public.fees
    FOR INSERT
    WITH CHECK (
        auth.role() = 'family' AND
        family_id = auth.uid() AND
        status = 'pending'
    );

-- Families should not be able to UPDATE or DELETE fees directly; those actions are handled via server actions.

-- ------------------------------------------------------------
-- Triggers to keep updated_at fresh
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_fees_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fees_timestamp
BEFORE UPDATE ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.set_fees_timestamp();

-- ------------------------------------------------------------
-- Notification channel (optional) – using PostgreSQL NOTIFY for payment events
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_fee_change()
RETURNS trigger AS $$
DECLARE
    payload json := json_build_object(
        'fee_id', NEW.id,
        'status', NEW.status,
        'amount_cents', NEW.amount_cents,
        'family_id', NEW.family_id
    );
BEGIN
    PERFORM pg_notify('fee_changes', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fee_notify
AFTER INSERT OR UPDATE ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.notify_fee_change();

-- End of migration
