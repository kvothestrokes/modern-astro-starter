/**
 * Queries Supabase para administración de productos: CRUD y carga masiva.
 */

import { supabase } from '../supabase';
import type { ProductPayload, ProductBulkRow } from '../../types/catalog';
import type { ProductVariantRow } from '../../types/catalog';

export interface ProductVariantPayload {
  label: string;
  value: string;
  stock?: number | null;
}

export interface ListProductsAdminOptions {
  category?: string;
  product_type?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export async function listProductsAdmin(opts: ListProductsAdminOptions = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.product_type) query = query.eq('product_type', opts.product_type);
  if (opts.is_active !== undefined) query = query.eq('is_active', opts.is_active);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function createProduct(
  payload: ProductPayload,
  variants?: ProductVariantPayload[]
) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: payload.name,
      slug: payload.slug,
      product_type: payload.product_type,
      category: payload.category,
      subcategory: payload.subcategory ?? null,
      tags: payload.tags ?? [],
      price: payload.price,
      sale_price: payload.sale_price ?? null,
      image_urls: payload.image_urls ?? [],
      is_active: payload.is_active ?? true
    })
    .select('id')
    .single();

  if (productError) throw productError;
  if (!product?.id) throw new Error('Product not created');

  if (variants?.length) {
    const rows = variants.map((v) => ({
      product_id: product.id,
      label: v.label,
      value: v.value,
      stock: v.stock ?? null
    }));
    const { error: variantsError } = await supabase.from('product_variants').insert(rows);
    if (variantsError) throw variantsError;
  }

  return product.id;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
  variants?: ProductVariantPayload[]
) {
  const updatePayload: Record<string, unknown> = {};
  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.slug !== undefined) updatePayload.slug = payload.slug;
  if (payload.product_type !== undefined) updatePayload.product_type = payload.product_type;
  if (payload.category !== undefined) updatePayload.category = payload.category;
  if (payload.subcategory !== undefined) updatePayload.subcategory = payload.subcategory;
  if (payload.tags !== undefined) updatePayload.tags = payload.tags;
  if (payload.price !== undefined) updatePayload.price = payload.price;
  if (payload.sale_price !== undefined) updatePayload.sale_price = payload.sale_price;
  if (payload.image_urls !== undefined) updatePayload.image_urls = payload.image_urls;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from('products').update(updatePayload).eq('id', id);
    if (error) throw error;
  }

  if (variants !== undefined) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    if (variants.length > 0) {
      const rows = variants.map((v) => ({
        product_id: id,
        label: v.label,
        value: v.value,
        stock: v.stock ?? null
      }));
      const { error: variantsError } = await supabase.from('product_variants').insert(rows);
      if (variantsError) throw variantsError;
    }
  }

  return id;
}

export async function toggleProductActive(id: string, is_active: boolean) {
  const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
  if (error) throw error;
}

/** Genera slug desde nombre: minúsculas, espacios → guiones, sin caracteres raros */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u00C0-\u024F-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'producto';
}

/** Validación para fila de carga masiva */
export function validateBulkRow(row: ProductBulkRow): string | null {
  if (!row.name?.trim()) return 'name required';
  if (!row.product_type?.trim()) return 'product_type required';
  if (!row.category?.trim()) return 'category required';
  const price = Number(row.price);
  if (Number.isNaN(price) || price < 0) return 'invalid price';
  if (row.sale_price != null) {
    const sale = Number(row.sale_price);
    if (Number.isNaN(sale) || sale < 0) return 'invalid sale_price';
  }
  return null;
}

/** Inserción en lote. Genera slug único por nombre si no se provee. */
export async function bulkInsertProducts(rows: ProductBulkRow[]): Promise<{ inserted: number; errors: { row: number; message: string }[] }> {
  const errors: { row: number; message: string }[] = [];
  const toInsert: Array<Record<string, unknown>> = [];
  const seenSlugs = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const err = validateBulkRow(row);
    if (err) {
      errors.push({ row: i + 1, message: err });
      continue;
    }
    let slug = slugify(row.name);
    let suffix = 0;
    while (seenSlugs.has(slug)) {
      suffix++;
      slug = `${slugify(row.name)}-${suffix}`;
    }
    seenSlugs.add(slug);

    toInsert.push({
      name: row.name.trim(),
      slug,
      product_type: row.product_type.trim(),
      category: row.category.trim(),
      subcategory: row.subcategory?.trim() || null,
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean) : []),
      price: Number(row.price),
      sale_price: row.sale_price != null && row.sale_price !== '' ? Number(row.sale_price) : null,
      image_urls: Array.isArray(row.image_urls) ? row.image_urls : (row.image_urls ? String(row.image_urls).split(',').map((u) => u.trim()).filter(Boolean) : []),
      is_active: true
    });
  }

  if (toInsert.length === 0) return { inserted: 0, errors };

  const { error } = await supabase.from('products').insert(toInsert);
  if (error) {
    errors.push({ row: 0, message: error.message });
    return { inserted: 0, errors };
  }

  return { inserted: toInsert.length, errors };
}
