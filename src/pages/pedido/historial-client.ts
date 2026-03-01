import { getOrderHistory } from '../../lib/orderHistory';

function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render() {
  const container = document.getElementById('historial-container');
  if (!container) return;

  const history = getOrderHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
        <p class="font-semibold text-zinc-800">Aún no tienes pedidos</p>
        <p class="mt-1 text-sm text-zinc-600">Los pedidos que crees desde este navegador aparecerán aquí.</p>
        <a href="/pedido" class="mt-4 inline-block rounded-lg border border-amber-600 bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600">Crear pedido</a>
      </div>
    `;
    return;
  }

  const listHtml = history
    .map((order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
        dateStyle: 'long'
      });
      const shortId = order.orderId.slice(0, 8).toUpperCase();
      const rows = order.products
        .map(
          (p) => {
            const displayName = escapeHtml(p.name ?? p.productType);
            const imageUrl = p.imageUrl ?? '';
            const imgCell = imageUrl
              ? `<td class="py-2 pr-3 align-middle">
                  <img src="${escapeHtml(imageUrl)}" alt="" class="h-12 w-12 rounded-lg border border-zinc-200 object-cover" width="48" height="48" loading="lazy" />
                </td>`
              : '<td class="py-2 pr-3 align-middle"><span class="text-zinc-400">—</span></td>';
            return `
          <tr class="border-b border-zinc-100">
            ${imgCell}
            <td class="py-2 pr-3 font-medium text-zinc-900">${displayName}</td>
            <td class="py-2 pr-3">${escapeHtml(p.size ?? '-')}</td>
            <td class="py-2 pr-3">${escapeHtml(p.color ?? '-')}</td>
            <td class="py-2 pr-3">${p.quantity}</td>
          </tr>`;
          }
        )
        .join('');
      return `
        <article class="rounded-xl border-2 border-zinc-200 bg-white p-4 md:p-6">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-base font-semibold text-zinc-900">
              Pedido ${escapeHtml(shortId)} · ${escapeHtml(order.customerName)}
            </h2>
            <time class="text-sm text-zinc-500" datetime="${escapeHtml(order.createdAt)}">${escapeHtml(dateStr)}</time>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-zinc-700">
              <thead>
                <tr class="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                  <th class="pb-2 pr-3">Imagen</th>
                  <th class="pb-2 pr-3">Producto</th>
                  <th class="pb-2 pr-3">Talla</th>
                  <th class="pb-2 pr-3">Color</th>
                  <th class="pb-2 pr-3">Cantidad</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </article>
      `;
    })
    .join('');

  container.innerHTML = `<div class="space-y-4">${listHtml}</div>`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}
