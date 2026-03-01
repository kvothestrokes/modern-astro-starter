-- Catálogo: productos y variantes.
-- Ejecutar en el SQL Editor de Supabase. No modifica tablas existentes (orders, garments, designs, etc.).

-- Tabla products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  product_type text NOT NULL,
  category text NOT NULL,
  subcategory text,
  tags text[] DEFAULT '{}',
  price numeric NOT NULL,
  sale_price numeric,
  image_urls text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products (slug);
CREATE INDEX IF NOT EXISTS products_category_product_type_idx ON products (category, product_type);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON products (is_active);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at DESC);

-- Tabla product_variants
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  stock int
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);

-- RLS (opcional): permitir lectura pública de productos activos y escritura solo con service role o auth.
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = true);
-- CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (true);
