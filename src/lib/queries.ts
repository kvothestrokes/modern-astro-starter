import { supabase } from './supabase';
import type { OrderDraft } from '../types/order';
import type { DesignStatus } from '../types/status';
import { INITIAL_ORDER_STATUS, type OrderStatus } from './order-status';

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
      status: INITIAL_ORDER_STATUS,
      requires_invoice: draft.requiresInvoice
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  const productIdMap = new Map<string, string>();
  for (const item of draft.products) {
    const { data, error } = await supabase
      .from('garments')
      .insert({
        order_id: order.id,
        product_type: item.productType,
        size: item.size || null,
        color: item.color || null,
        quantity: item.quantity,
        notes: item.notes || null
      })
      .select('id')
      .single();
    if (error) throw error;
    productIdMap.set(item.localId, data.id);
  }

  const designIdMap = new Map<string, string>();
  for (const design of draft.designs) {
    const { data, error } = await supabase
      .from('designs')
      .insert({
        order_id: order.id,
        original_image_url: design.originalImageUrl,
        storage_path: design.storagePath || null,
        status: design.status,
        notes: design.notes || null
      })
      .select('id')
      .single();
    if (error) throw error;
    designIdMap.set(design.localId, data.id);
  }

  const assignmentsPayload = draft.assignments
    .map((item) => ({
      design_id: designIdMap.get(item.designLocalId),
      garment_id: productIdMap.get(item.productLocalId),
      position: item.position || 'front',
      scale: item.scale || null,
      notes: item.notes || null
    }))
    .filter((item): item is typeof item & { design_id: string; garment_id: string } => Boolean(item.design_id && item.garment_id));

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

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  return supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
}
