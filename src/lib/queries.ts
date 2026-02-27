import { supabase } from './supabase';
import type { OrderDraft } from '../types/order';
import type { DesignStatus } from '../types/status';

const PAGE_SIZE = 20;

export async function createOrderGraph(draft: OrderDraft) {
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name: draft.customerName,
      email: draft.customerEmail || null,
      phone: draft.customerPhone || null,
      customer_type: draft.customerType,
      notes: draft.notes || null
    })
    .select('id')
    .single();

  if (customerError) throw customerError;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      status: draft.designs[0]?.status || 'falta_diseno',
      requires_invoice: draft.requiresInvoice
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  const garmentsPayload = draft.products.map((item) => ({
    order_id: order.id,
    product_type: item.productType,
    size: item.size || null,
    color: item.color || null,
    quantity: item.quantity,
    notes: item.notes || null
  }));

  const { data: garments, error: garmentsError } = await supabase
    .from('garments')
    .insert(garmentsPayload)
    .select('id, product_type');

  if (garmentsError) throw garmentsError;

  const designsPayload = draft.designs.map((design) => ({
    order_id: order.id,
    original_image_url: design.originalImageUrl,
    storage_path: design.storagePath || null,
    status: design.status,
    notes: design.notes || null
  }));

  const { data: designs, error: designsError } = await supabase
    .from('designs')
    .insert(designsPayload)
    .select('id, original_image_url');

  if (designsError) throw designsError;

  const garmentByProductType = new Map(garments.map((g) => [g.product_type, g.id]));
  const designByUrl = new Map(designs.map((d) => [d.original_image_url, d.id]));

  const assignmentsPayload = draft.assignments
    .map((item) => {
      const draftDesign = draft.designs.find((d) => d.localId === item.designLocalId);
      const draftProduct = draft.products.find((p) => p.localId === item.productLocalId);
      const designId = draftDesign ? designByUrl.get(draftDesign.originalImageUrl) : undefined;
      const garmentId = draftProduct ? garmentByProductType.get(draftProduct.productType) : undefined;
      if (!designId || !garmentId) return null;
      return {
        design_id: designId,
        garment_id: garmentId,
        position: item.position,
        scale: item.scale || null,
        notes: item.notes || null
      };
    })
    .filter(Boolean);

  if (assignmentsPayload.length > 0) {
    const { error: assignmentsError } = await supabase.from('design_assignments').insert(assignmentsPayload);
    if (assignmentsError) throw assignmentsError;
  }

  return order.id;
}

export async function listOrders(options: { page?: number; status?: DesignStatus; search?: string }) {
  const page = options.page || 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('orders')
    .select(
      `
      id,
      status,
      created_at,
      customers(name),
      garments(product_type, quantity),
      designs(id, original_image_url, status)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) query = query.eq('status', options.status);
  if (options.search) query = query.or(`id.ilike.%${options.search}%`);

  return query;
}

export async function updateDesignStatus(designId: string, status: DesignStatus) {
  return supabase.from('designs').update({ status }).eq('id', designId);
}
