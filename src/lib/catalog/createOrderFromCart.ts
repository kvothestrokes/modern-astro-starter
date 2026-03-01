/**
 * Crea un pedido en Supabase a partir del carrito del catálogo.
 * Inserta customer placeholder, order y garments; vacía el carrito y redirige a /pedido/exito.
 */

import { createClient } from '@supabase/supabase-js';
import { INITIAL_ORDER_STATUS } from '../order-status';
import { addOrderToHistory } from '../orderHistory';
import { getItems, clearCart } from './cartStore';

const PLACEHOLDER_CUSTOMER_NAME = 'Cliente catálogo';

export async function createOrderFromCart(): Promise<void> {
  const items = getItems();
  if (items.length === 0) return;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Para crear el pedido es necesario configurar la conexión. Contacta al administrador si el problema continúa.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name: PLACEHOLDER_CUSTOMER_NAME,
      email: null,
      phone: null,
      customer_type: 'minorista',
      notes: null
    })
    .select('id')
    .single();
  if (customerError) throw customerError;
  if (!customer?.id) throw new Error('No se pudo crear el cliente');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      status: INITIAL_ORDER_STATUS,
      requires_invoice: false
    })
    .select('id')
    .single();
  if (orderError) throw orderError;
  if (!order?.id) throw new Error('No se pudo crear el pedido');

  for (const item of items) {
    const { error: garmentError } = await supabase.from('garments').insert({
      order_id: order.id,
      product_id: item.productId,
      product_type: item.product_type,
      size: item.size ?? null,
      color: item.color ?? null,
      quantity: item.quantity,
      notes: null
    });
    if (garmentError) throw garmentError;
  }

  addOrderToHistory({
    orderId: order.id,
    createdAt: new Date().toISOString(),
    customerName: PLACEHOLDER_CUSTOMER_NAME,
    products: items.map((p) => ({
      productType: p.product_type,
      name: p.name,
      imageUrl: p.imageUrl ?? '',
      size: p.size,
      color: p.color,
      quantity: p.quantity
    }))
  });

  clearCart();
  window.location.href = `/pedido/exito?orderId=${order.id}`;
}
