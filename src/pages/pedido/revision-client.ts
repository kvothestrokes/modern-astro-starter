import { createClient } from '@supabase/supabase-js';
import { INITIAL_ORDER_STATUS } from '../../lib/order-status';
import { addOrderToHistory } from '../../lib/orderHistory';
import { addPhoneIfNew } from '../../lib/savedPhones';

const KEY = 'order-draft-v1';

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function escapeHtml(str: string | null | undefined) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeSrc(url: string | null | undefined) {
  if (url == null) return '';
  return String(url).replace(/"/g, '&quot;');
}

const positionLabels: Record<string, string> = { front: 'Frente', back: 'Espalda', sleeve: 'Manga', other: 'Otro' };
function positionLabel(pos: string) {
  return positionLabels[pos] || pos || 'Frente';
}

function renderReview() {
  const customerEl = document.getElementById('reviewCustomer');
  const productsBody = document.getElementById('reviewProducts');
  const productsEmpty = document.getElementById('reviewProductsEmpty');
  const designsEl = document.getElementById('reviewDesigns');
  const designsEmpty = document.getElementById('reviewDesignsEmpty');
  const supabaseHint = document.getElementById('supabaseHint');

  if (!customerEl || !productsBody || !designsEl) return;

  const draft = readDraft() as Record<string, unknown>;
  const hasData =
    draft.customerName ||
    ((draft.products as unknown[])?.length) ||
    ((draft.designs as unknown[])?.length);
  if (!hasData) {
    customerEl.innerHTML =
      '<p class="text-amber-700">Aún no hay datos. Completa el paso 1 y el paso 2 y vuelve aquí.</p>';
    productsBody.innerHTML = '';
    designsEl.innerHTML = '';
    if (productsEmpty) productsEmpty.classList.remove('hidden');
    if (designsEmpty) designsEmpty.classList.remove('hidden');
    return;
  }

  customerEl.innerHTML = `
    <p><span class="font-medium text-zinc-900">Nombre:</span> ${escapeHtml(String(draft.customerName ?? '-'))}</p>
    <p><span class="font-medium text-zinc-900">Tipo:</span> ${escapeHtml(String(draft.customerType ?? '-'))}</p>
    <p><span class="font-medium text-zinc-900">Correo:</span> ${escapeHtml(String(draft.customerEmail ?? '-'))}</p>
    <p><span class="font-medium text-zinc-900">Telefono:</span> ${escapeHtml(String(draft.customerPhone ?? '-'))}</p>
    <p><span class="font-medium text-zinc-900">Notas:</span> ${escapeHtml(String(draft.notes ?? '-'))}</p>
  `;

  const products = (draft.products as Array<Record<string, unknown>>) || [];
  if (products.length === 0) {
    productsBody.innerHTML = '';
    if (productsEmpty) productsEmpty.classList.remove('hidden');
  } else {
    const designsList = (draft.designs as Array<Record<string, unknown>>) || [];
    const assignments = (draft.assignments as Array<Record<string, unknown>>) || [];
    if (productsEmpty) productsEmpty.classList.add('hidden');
    productsBody.innerHTML = products
      .map((p) => {
        const productAssignments = assignments.filter(
          (a) => a.productLocalId === p.localId
        );
        const designPositions = productAssignments
          .map((a) => {
            const designIndex = designsList.findIndex(
              (d) => d.localId === a.designLocalId
            );
            const num = designIndex >= 0 ? designIndex + 1 : 0;
            const pos = positionLabel(String(a.position ?? 'front'));
            return `Diseño ${num} (${pos})`;
          })
          .filter(Boolean)
          .join(', ');
        return `<tr class="border-b border-zinc-100">
            <td class="py-2 pr-3 font-medium">${escapeHtml(String(p.productType ?? ''))}</td>
            <td class="py-2 pr-3">${escapeHtml(String(p.size ?? '-'))}</td>
            <td class="py-2 pr-3">${escapeHtml(String(p.color ?? '-'))}</td>
            <td class="py-2 pr-3">${Number(p.quantity) || 0}</td>
            <td class="py-2 pr-3 text-zinc-600">${escapeHtml(designPositions || '-')}</td>
          </tr>`;
      })
      .join('');
  }

  const designs = (draft.designs as Array<Record<string, unknown>>) || [];
  const assignments = (draft.assignments as Array<Record<string, unknown>>) || [];
  if (designs.length === 0) {
    designsEl.innerHTML = '';
    if (designsEmpty) designsEmpty.classList.remove('hidden');
  } else {
    if (designsEmpty) designsEmpty.classList.add('hidden');
    designsEl.innerHTML = designs
      .map((d, index) => {
        const designTitle = 'Diseño ' + (index + 1);
        const related = assignments.filter(
          (a) => a.designLocalId === d.localId
        );
        const productList = (draft.products as Array<Record<string, unknown>>) || [];
        const list = related
          .map((a) => {
            const p = productList.find((x) => x.localId === a.productLocalId);
            return p
              ? `${p.productType} (${positionLabel(String(a.position ?? 'front'))})`
              : null;
          })
          .filter(Boolean)
          .join(', ');
        const imgSrc = d.originalImageUrl
          ? safeSrc(String(d.originalImageUrl))
          : '';
        return `
          <article class="rounded-lg border border-zinc-200 p-3">
            <p class="mb-2 text-sm font-semibold text-zinc-900">${escapeHtml(designTitle)}</p>
            <img loading="lazy" class="mb-2 h-32 w-full rounded object-cover" src="${imgSrc}" alt="${escapeHtml(designTitle)}" />
            <p class="text-xs font-medium text-zinc-600">Asignado a: ${escapeHtml(list || 'Ninguno')}</p>
          </article>`;
      })
      .join('');
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseHint && !supabaseUrl && !supabaseAnonKey)
    supabaseHint.classList.remove('hidden');
}

async function submitOrder() {
  const feedbackEl = document.getElementById('submitFeedback');
  const confirmBtn = document.getElementById('confirmSubmit');
  const draft = readDraft() as Record<string, unknown>;
  if (!draft.customerName) {
    if (feedbackEl)
      feedbackEl.textContent = 'Por favor indica el nombre del cliente.';
    return;
  }
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (feedbackEl)
      feedbackEl.textContent =
        'Para enviar el pedido es necesario configurar la conexión. Contacta al administrador si el problema continúa.';
    return;
  }
  if (feedbackEl) feedbackEl.textContent = 'Creando pedido...';
  if (confirmBtn) (confirmBtn as HTMLButtonElement).disabled = true;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const phone = draft.customerPhone
      ? String(draft.customerPhone).trim() || null
      : null;
    let customerId: string;

    if (phone) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: draft.customerName,
            email: draft.customerEmail || null,
            phone,
            customer_type: draft.customerType || 'mayorista',
            notes: draft.notes || null
          })
          .select('id')
          .single();
        if (customerError) throw customerError;
        customerId = newCustomer.id;
        addPhoneIfNew(phone);
      }
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: draft.customerName,
          email: draft.customerEmail || null,
          phone: null,
          customer_type: draft.customerType || 'mayorista',
          notes: draft.notes || null
        })
        .select('id')
        .single();
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        status: INITIAL_ORDER_STATUS,
        requires_invoice: Boolean(draft.requiresInvoice)
      })
      .select('id')
      .single();
    if (orderError) throw orderError;

    const productIdMap = new Map<string, string>();
    for (const item of (draft.products as Array<Record<string, unknown>>) || []) {
      const { data, error } = await supabase
        .from('garments')
        .insert({
          order_id: order.id,
          product_type: item.productType,
          size: item.size || null,
          color: item.color || null,
          quantity: Number(item.quantity) || 1,
          notes: item.notes || null
        })
        .select('id')
        .single();
      if (error) throw error;
      productIdMap.set(String(item.localId), data.id);
    }

    const designIdMap = new Map<string, string>();
    for (const design of (draft.designs as Array<Record<string, unknown>>) || []) {
      let imageUrl = String(design.originalImageUrl ?? '');
      let storagePath: string | null = design.storagePath
        ? String(design.storagePath)
        : null;
      if (imageUrl.startsWith('data:')) {
        console.log('[submitOrder] Uploading design via API…');
        const uploadRes = await fetch('/api/upload-design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: imageUrl })
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          console.error('[submitOrder] Upload API error', uploadRes.status, uploadJson);
          throw new Error(uploadJson?.error || `Upload failed: ${uploadRes.status}`);
        }
        imageUrl = uploadJson.publicUrl;
        storagePath = uploadJson.storagePath ?? null;
      }
      const { data, error } = await supabase
        .from('designs')
        .insert({
          order_id: order.id,
          original_image_url: imageUrl,
          storage_path: storagePath,
          status: design.status || 'recibido',
          notes: design.notes || null
        })
        .select('id')
        .single();
      if (error) throw error;
      designIdMap.set(String(design.localId), data.id);
    }

    const assignmentsPayload = ((draft.assignments as Array<Record<string, unknown>>) || [])
      .map((item) => ({
        design_id: designIdMap.get(String(item.designLocalId)),
        garment_id: productIdMap.get(String(item.productLocalId)),
        position: item.position || 'front',
        notes: item.notes || null
      }))
      .filter((item) => item.design_id && item.garment_id);

    if (assignmentsPayload.length > 0) {
      const { error } = await supabase
        .from('design_assignments')
        .insert(assignmentsPayload);
      if (error) throw error;
    }

    const historyItem = {
      orderId: order.id,
      createdAt: new Date().toISOString(),
      customerName: String(draft.customerName ?? ''),
      products: ((draft.products as Array<Record<string, unknown>>) || []).map((p) => ({
        productType: String(p.productType ?? ''),
        size: p.size != null ? String(p.size) : undefined,
        color: p.color != null ? String(p.color) : undefined,
        quantity: Number(p.quantity) || 1
      }))
    };
    addOrderToHistory(historyItem);

    localStorage.removeItem(KEY);
    window.location.href = `/pedido/exito?orderId=${order.id}`;
  } catch (err) {
    const detail =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    console.error('[submitOrder] Error', err, { detail });
    if (feedbackEl)
      feedbackEl.textContent =
        'No pudimos enviar el pedido. Revisa la consola (F12) para más detalle. Error: ' +
        detail;
    if (confirmBtn) (confirmBtn as HTMLButtonElement).disabled = false;
  }
}

const confirmBtn = document.getElementById('confirmSubmit');
if (confirmBtn) confirmBtn.addEventListener('click', submitOrder);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderReview);
} else {
  renderReview();
}
