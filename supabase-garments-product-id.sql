-- Añade la columna product_id a garments si no existe (pedidos por catálogo).
-- Ejecutar en el SQL Editor de Supabase. Requiere que la tabla products exista.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'garments' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE garments ADD COLUMN product_id uuid REFERENCES products(id);
    CREATE INDEX IF NOT EXISTS garments_product_id_idx ON garments (product_id);
  END IF;
END $$;
