-- Migration: align orders.status and designs.status with the 16 workflow states.
-- Run this in the Supabase SQL editor after checking your current column type.
--
-- If orders.status / designs.status are type TEXT (no enum):
--   Option A: Add a check constraint to allow only these values (replace existing constraint if any).
--
-- If they use a PostgreSQL ENUM:
--   Option B: Add new enum values and optionally migrate 'en_espera' -> 'en_espera_cliente'.

-- Allowed values (single source of truth, match src/lib/order-status.ts):
-- recibido, pendiente_pago, pagado, falta_diseno, en_espera_cliente, diseno_aprobado,
-- listo_para_impresion, falta_imprimir, impreso, tiene_detalle, corregido, empaquetada,
-- en_local, enviado, entregada, cancelado

-- ========== Option A: TEXT column with CHECK constraint ==========
-- Uncomment and run if your columns are TEXT. Drop existing constraint if you have one.

/*
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'recibido', 'pendiente_pago', 'pagado', 'falta_diseno', 'en_espera_cliente',
  'diseno_aprobado', 'listo_para_impresion', 'falta_imprimir', 'impreso',
  'tiene_detalle', 'corregido', 'empaquetada', 'en_local', 'enviado', 'entregada', 'cancelado'
));

ALTER TABLE designs DROP CONSTRAINT IF EXISTS designs_status_check;
ALTER TABLE designs ADD CONSTRAINT designs_status_check CHECK (status IN (
  'recibido', 'pendiente_pago', 'pagado', 'falta_diseno', 'en_espera_cliente',
  'diseno_aprobado', 'listo_para_impresion', 'falta_imprimir', 'impreso',
  'tiene_detalle', 'corregido', 'empaquetada', 'en_local', 'enviado', 'entregada', 'cancelado'
));
*/

-- ========== Option B: PostgreSQL ENUM ==========
-- If you use an enum type, add new values (run one at a time if needed):

/*
DO $$ BEGIN
  ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'pagado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'diseno_aprobado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'tiene_detalle';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'en_espera_cliente';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- If you had 'en_espera', migrate data then deprecate:
-- UPDATE orders SET status = 'en_espera_cliente' WHERE status = 'en_espera';
-- UPDATE designs SET status = 'en_espera_cliente' WHERE status = 'en_espera';
*/
