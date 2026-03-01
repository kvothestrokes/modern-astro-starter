-- Añade la columna color a garments si no existe.
-- Ejecutar en el SQL Editor de Supabase.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'garments' AND column_name = 'color'
  ) THEN
    ALTER TABLE garments ADD COLUMN color TEXT;
  END IF;
END $$;
