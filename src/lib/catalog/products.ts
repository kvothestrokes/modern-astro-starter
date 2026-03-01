/**
 * Queries Supabase para el catálogo (lectura). Solo productos activos.
 */

import { supabase } from '../supabase';
import type { ProductRow, ProductVariantRow } from '../../types/catalog';

export interface ListProductsOptions {
  category?: string;
  product_type?: string;
  search?: string;
  orderBy?: 'name' | 'price' | 'created_at';
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  /** Si true, incluye product_variants en cada producto (para selector de talla en catálogo). */
  includeVariants?: boolean;
}

export type ProductRowWithVariants = ProductRow & { product_variants?: ProductVariantRow[] };

const DEFAULT_PAGE_SIZE = 24;

export async function listProducts(opts: ListProductsOptions = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const selectFields = opts.includeVariants ? '*, product_variants(*)' : '*';
  let query = supabase
    .from('products')
    .select(selectFields, { count: 'exact' })
    .eq('is_active', true)
    .range(from, to);

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.product_type) query = query.eq('product_type', opts.product_type);
  if (opts.search?.trim()) {
    query = query.ilike('name', `%${opts.search.trim()}%`);
  }

  const orderBy = opts.orderBy ?? 'created_at';
  const orderDir = opts.orderDir ?? 'desc';
  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const { data, error, count } = await query;
  if (error) throw error;

  if (opts.includeVariants) {
    const normalized = (data ?? []).map((row: Record<string, unknown>) => {
      const { product_variants, ...rest } = row;
      return { ...rest, product_variants: product_variants ?? [] };
    });
    return { data: normalized as ProductRowWithVariants[], count: count ?? 0 };
  }
  return { data: (data ?? []) as ProductRow[], count: count ?? 0 };
}

export interface ProductWithVariantsRow extends ProductRow {
  product_variants: ProductVariantRow[] | null;
}

export async function getProductBySlug(slug: string) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (productError || !product) return null;

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .order('label')
    .order('value');

  if (variantsError) throw variantsError;

  return {
    ...product,
    product_variants: variants ?? []
  } as ProductWithVariantsRow;
}

export async function getProductById(id: string) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (productError || !product) return null;

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .order('label')
    .order('value');

  if (variantsError) throw variantsError;

  return {
    ...product,
    product_variants: variants ?? []
  } as ProductWithVariantsRow;
}
