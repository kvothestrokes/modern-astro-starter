import { createClient } from '@supabase/supabase-js';
import { isTransitionAllowed, getNextStatuses, type OrderStatus } from '../../lib/order-status';
import type { DesignStatus } from '../../types/status';

const PAGE_SIZE = 20;
const STORAGE_KEY_COLUMNS = 'pedidos-visible-columns';
const STORAGE_KEY_COLUMN_ORDER = 'pedidos-column-order';
const STORAGE_KEY_COLUMN_WIDTHS = 'pedidos-column-widths';
const STORAGE_KEY_PRESETS = 'pedidos-presets';

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  customers: { name: string | null; notes: string | null } | null;
  garments: Array<{ id: string; product_type: string | null; quantity: number }> | null;
  designs: Array<{ id: string; original_image_url: string | null; status: string }> | null;
};

type OrdersData = {
  orders: OrderRow[];
  labels: Record<string, string>;
  badgeClass: Record<string, string>;
  statusGroups: { activos: string[]; espera: string[]; finales: string[] };
};

type FilterState = {
  status: string[];
  q: string;
  cliente: string;
  producto: string;
  notas: string;
  fechaDesde: string;
  fechaHasta: string;
  cantidadMin: number | '';
  cantidadMax: number | '';
};

type SortItem = { column: string; dir: 'asc' | 'desc' };
type Preset = { name: string; filters: Partial<FilterState>; sort: SortItem[]; visibleColumns: string[]; columnOrder: string[]; columnWidths?: Record<string, number> };

function getData(): OrdersData | null {
  const w = window as Window & { __PEDIDOS_DATA__?: OrdersData };
  return w.__PEDIDOS_DATA__ ?? null;
}

function getStoredColumns(): string[] | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (!s) return null;
    return JSON.parse(s) as string[];
  } catch {
    return null;
  }
}

function getStoredColumnOrder(): string[] | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY_COLUMN_ORDER);
    if (!s) return null;
    return JSON.parse(s) as string[];
  } catch {
    return null;
  }
}

const DEFAULT_COLUMNS = ['id', 'cliente', 'producto', 'diseno', 'cantidad', 'estado', 'fecha', 'acciones'];

function getColumnOrder(): string[] {
  return getStoredColumnOrder() ?? [...DEFAULT_COLUMNS];
}

function getVisibleColumns(): string[] {
  return getStoredColumns() ?? [...DEFAULT_COLUMNS];
}

function getStoredColumnWidths(): Record<string, number> {
  try {
    const s = localStorage.getItem(STORAGE_KEY_COLUMN_WIDTHS);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function getOrderValue(order: OrderRow, column: string): string | number | null {
  const o = order as Record<string, unknown>;
  if (column === 'id') return o.id as string;
  if (column === 'cliente') return (o.customers as { name?: string } | null)?.name ?? '';
  if (column === 'producto') {
    const g = (o.garments as Array<{ product_type?: string }>) ?? [];
    return g[0]?.product_type ?? '';
  }
  if (column === 'cantidad') {
    const g = (o.garments as Array<{ quantity: number }>) ?? [];
    return g.reduce((s, i) => s + i.quantity, 0);
  }
  if (column === 'estado') return (o.status as string) ?? '';
  if (column === 'fecha') return (o.created_at as string) ?? '';
  return null;
}

function getOrderTotalQty(order: OrderRow): number {
  const g = order.garments ?? [];
  return g.reduce((s, i) => s + i.quantity, 0);
}

function filterOrders(orders: OrderRow[], filters: FilterState): OrderRow[] {
  return orders.filter((order) => {
    const status = (order.status || '') as string;
    if (filters.status.length && !filters.status.includes(status)) return false;

    const q = (filters.q || '').toLowerCase();
    if (q) {
      const idMatch = order.id.toLowerCase().includes(q);
      const clienteMatch = ((order.customers as { name?: string })?.name ?? '').toLowerCase().includes(q);
      const productMatch = (order.garments?.[0]?.product_type ?? '').toLowerCase().includes(q);
      const notasMatch = ((order.customers as { notes?: string })?.notes ?? '').toLowerCase().includes(q);
      if (!idMatch && !clienteMatch && !productMatch && !notasMatch) return false;
    }

    const cliente = ((order.customers as { name?: string })?.name ?? '').toLowerCase();
    if (filters.cliente && !cliente.includes((filters.cliente || '').toLowerCase())) return false;

    const firstProduct = order.garments?.[0]?.product_type ?? '';
    if (filters.producto && !firstProduct.toLowerCase().includes((filters.producto || '').toLowerCase())) return false;

    const notes = ((order.customers as { notes?: string })?.notes ?? '').toLowerCase();
    if (filters.notas && !notes.includes((filters.notas || '').toLowerCase())) return false;

    if (filters.fechaDesde) {
      const d = new Date(order.created_at);
      d.setHours(0, 0, 0, 0);
      if (d < new Date(filters.fechaDesde + 'T00:00:00')) return false;
    }
    if (filters.fechaHasta) {
      const d = new Date(order.created_at);
      d.setHours(23, 59, 59, 999);
      if (d > new Date(filters.fechaHasta + 'T23:59:59')) return false;
    }

    const totalQty = getOrderTotalQty(order);
    if (filters.cantidadMin !== '' && totalQty < (filters.cantidadMin as number)) return false;
    if (filters.cantidadMax !== '' && totalQty > (filters.cantidadMax as number)) return false;

    return true;
  });
}

function sortOrders(orders: OrderRow[], sort: SortItem[], labels: Record<string, string>): OrderRow[] {
  if (!sort.length) return [...orders];
  return [...orders].sort((a, b) => {
    for (const { column, dir } of sort) {
      const va = getOrderValue(a, column);
      const vb = getOrderValue(b, column);
      let cmp = 0;
      if (va == null && vb == null) cmp = 0;
      else if (va == null) cmp = 1;
      else if (vb == null) cmp = -1;
      else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else if (typeof va === 'string' && typeof vb === 'string') {
        if (column === 'fecha') cmp = new Date(va).getTime() - new Date(vb).getTime();
        else cmp = va.localeCompare(vb, 'es');
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/** Escape for use inside a double-quoted HTML attribute (e.g. data-statuses="..."). */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderRow(
  order: OrderRow,
  labels: Record<string, string>,
  badgeClass: Record<string, string>,
  visibleCols: string[]
): string {
  const firstProduct = order.garments?.[0];
  const totalQty = getOrderTotalQty(order);
  const firstDesign = order.designs?.[0];
  const orderStatus = (order.status || 'recibido') as DesignStatus;
  const nextStatuses = getNextStatuses(orderStatus);
  const customerName = (order.customers as { name?: string })?.name ?? '-';
  const productType = firstProduct?.product_type ?? '-';

  const designUrls = (order.designs ?? []).map((d) => (d as { original_image_url?: string }).original_image_url).filter(Boolean);
  const badge = badgeClass[orderStatus] ?? 'bg-zinc-100 text-zinc-800';
  const statusLabel = labels[orderStatus] ?? orderStatus;
  const dateStr = new Date(order.created_at).toLocaleDateString('es-MX');

  const cells: string[] = [];
  if (visibleCols.includes('id')) {
    cells.push(`<td class="px-3 py-2 font-mono text-xs" data-column="id">${escapeHtml(order.id.slice(0, 8))}</td>`);
  }
  if (visibleCols.includes('cliente')) {
    cells.push(`<td class="px-3 py-2" data-column="cliente">${escapeHtml(customerName)}</td>`);
  }
  if (visibleCols.includes('producto')) {
    cells.push(`<td class="px-3 py-2" data-column="producto">${escapeHtml(productType)}</td>`);
  }
  if (visibleCols.includes('diseno')) {
    const disenoCell = firstDesign
      ? `<div class="design-cell" data-design-urls="${escapeAttr(JSON.stringify(designUrls))}">
          <button type="button" class="ver-disenos-btn rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs hover:bg-zinc-100" data-expanded="false">Ver diseños</button>
          <div class="design-preview mt-2 hidden min-h-[3.5rem]" aria-live="polite"></div>
        </div>`
      : '-';
    cells.push(`<td class="px-3 py-2" data-column="diseno">${disenoCell}</td>`);
  }
  if (visibleCols.includes('cantidad')) {
    cells.push(`<td class="px-3 py-2" data-column="cantidad">${totalQty}</td>`);
  }
  if (visibleCols.includes('estado')) {
    const buttons = nextStatuses
      .map(
        (next) =>
          `<button type="button" class="order-status-btn inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50" data-order-id="${escapeHtml(order.id)}" data-current-status="${escapeHtml(orderStatus)}" data-next-status="${next}">${labels[next] ?? next}</button>`
      )
      .join('');
    const statusCell = `<span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs ${badge}">${escapeHtml(statusLabel)}</span>${nextStatuses.length ? `<div class="mt-2 flex flex-wrap gap-1">${buttons}</div>` : '<span class="mt-2 block text-xs text-zinc-500">—</span>'}`;
    cells.push(`<td class="px-3 py-2 sticky left-0 z-10 bg-white" data-column="estado">${statusCell}</td>`);
  }
  if (visibleCols.includes('fecha')) {
    cells.push(`<td class="px-3 py-2 text-xs text-zinc-600" data-column="fecha">${escapeHtml(dateStr)}</td>`);
  }
  if (visibleCols.includes('acciones')) {
    cells.push(`<td class="px-3 py-2 sticky right-0 z-10 bg-white" data-column="acciones"><a class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50" href="/admin/pedidos/${escapeHtml(order.id)}">Ver</a></td>`);
  }

  return `<tr class="pedidos-row border-b border-zinc-100 align-top hover:bg-zinc-50" data-order-id="${escapeHtml(order.id)}">${cells.join('')}</tr>`;
}

function run() {
  const data = getData();
  if (!data) return;

  const { orders: rawOrders, labels, badgeClass } = data;
  let filters: FilterState = {
    status: [],
    q: '',
    cliente: '',
    producto: '',
    notas: '',
    fechaDesde: '',
    fechaHasta: '',
    cantidadMin: '',
    cantidadMax: ''
  };
  let sort: SortItem[] = [];
  let page = 1;
  let visibleColumns = getVisibleColumns();
  let columnOrder = getColumnOrder();
  let columnWidths = getStoredColumnWidths();

  const tbody = document.getElementById('pedidos-tbody');
  const summaryEl = document.getElementById('pedidos-summary');
  const paginationEl = document.getElementById('pedidos-pagination');
  const table = document.getElementById('pedidos-table');
  document.getElementById('pedidos-btn-actualizar')?.addEventListener('click', () => window.location.reload());

  const columnLabels: Record<string, string> = {
    id: 'Pedido',
    cliente: 'Cliente',
    producto: 'Producto',
    diseno: 'Diseño',
    cantidad: 'Cantidad',
    estado: 'Estado',
    fecha: 'Fecha',
    acciones: 'Acciones'
  };

  const dropColumnas = document.getElementById('pedidos-dropdown-columnas');
  const dropVistas = document.getElementById('pedidos-dropdown-vistas');
  const btnColumnas = document.getElementById('pedidos-btn-columnas');
  const btnVistas = document.getElementById('pedidos-btn-vistas');

  function getPresets(): Preset[] {
    try {
      const s = localStorage.getItem(STORAGE_KEY_PRESETS);
      const list = s ? JSON.parse(s) : [];
      return list;
    } catch {
      return [];
    }
  }
  function savePreset(name: string) {
    const presets = getPresets();
    presets.push({
      name,
      filters: { ...filters },
      sort: [...sort],
      visibleColumns: [...visibleColumns],
      columnOrder: [...columnOrder],
      columnWidths: { ...columnWidths }
    });
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    if (dropVistas) refreshVistasContent();
  }

  function refreshColumnasContent() {
    if (!dropColumnas) return;
    dropColumnas.innerHTML = DEFAULT_COLUMNS.map(
      (col) =>
        `<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-zinc-50"><input type="checkbox" class="pedidos-col-toggle" data-column="${escapeHtml(col)}" ${visibleColumns.includes(col) ? 'checked' : ''}/>${escapeHtml(columnLabels[col] ?? col)}</label>`
    ).join('');
  }
  function refreshVistasContent() {
    if (!dropVistas) return;
    const presets = getPresets();
    dropVistas.innerHTML = `
      <button type="button" class="pedidos-preset-save w-full rounded px-2 py-1 text-left text-sm hover:bg-zinc-50">Guardar vista actual</button>
      ${presets.length ? '<hr class="my-2 border-zinc-100"/>' : ''}
      ${presets.map((p, i) => `<button type="button" class="pedidos-preset-apply w-full rounded px-2 py-1 text-left text-sm hover:bg-zinc-50" data-preset-index="${i}">${escapeHtml(p.name)}</button>`).join('')}
    `;
  }

  const OPEN_BTN_CLASSES = ['bg-zinc-100', 'ring-1', 'ring-zinc-300'];
  function closeOtherDropdowns(except: HTMLElement | null) {
    if (dropColumnas && dropColumnas !== except) {
      dropColumnas.classList.add('hidden');
      OPEN_BTN_CLASSES.forEach((c) => btnColumnas?.classList.remove(c));
      btnColumnas?.setAttribute('aria-expanded', 'false');
    }
    if (dropVistas && dropVistas !== except) {
      dropVistas.classList.add('hidden');
      OPEN_BTN_CLASSES.forEach((c) => btnVistas?.classList.remove(c));
      btnVistas?.setAttribute('aria-expanded', 'false');
    }
  }
  function openColumnas() {
    if (!dropColumnas || !btnColumnas) return;
    closeOtherDropdowns(dropColumnas);
    dropColumnas.classList.toggle('hidden');
    const isOpen = dropColumnas.classList.contains('hidden') === false;
    btnColumnas.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      OPEN_BTN_CLASSES.forEach((c) => btnColumnas.classList.add(c));
      refreshColumnasContent();
    } else {
      OPEN_BTN_CLASSES.forEach((c) => btnColumnas.classList.remove(c));
    }
  }
  function openVistas() {
    if (!dropVistas || !btnVistas) return;
    closeOtherDropdowns(dropVistas);
    dropVistas.classList.toggle('hidden');
    const isOpen = dropVistas.classList.contains('hidden') === false;
    btnVistas.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      OPEN_BTN_CLASSES.forEach((c) => btnVistas.classList.add(c));
      refreshVistasContent();
    } else {
      OPEN_BTN_CLASSES.forEach((c) => btnVistas.classList.remove(c));
    }
  }

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-pedidos-action="toggle-columnas"]')) {
        e.preventDefault();
        e.stopPropagation();
        openColumnas();
        return;
      }
      if (target.closest?.('[data-pedidos-action="toggle-vistas"]')) {
        e.preventDefault();
        e.stopPropagation();
        openVistas();
        return;
      }
      if (!target.closest?.('#pedidos-dropdown-columnas') && !target.closest?.('#pedidos-dropdown-vistas')) {
        closeOtherDropdowns(null);
      }
    },
    true
  );

  if (!tbody || !summaryEl || !paginationEl) return;

  function getFiltered(): OrderRow[] {
    return sortOrders(filterOrders(rawOrders, filters), sort, labels);
  }

  function applyColumnVisibility() {
    if (!table) return;
    const visibleOrdered = columnOrder.filter((c) => visibleColumns.includes(c));
    table.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
      const col = th.dataset.column;
      if (!col) return;
      th.style.display = visibleColumns.includes(col) ? '' : 'none';
      const w = columnWidths[col];
      if (typeof w === 'number' && w > 0) th.style.minWidth = th.style.width = `${w}px`;
      else th.style.minWidth = th.style.width = '';
    });
    reorderHeaderCells();
    attachResizers();
  }

  function attachResizers() {
    table?.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
      if (th.querySelector('.pedidos-resizer')) return;
      const col = th.dataset.column;
      if (!col) return;
      const resizer = document.createElement('span');
      resizer.className = 'pedidos-resizer absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-300';
      resizer.setAttribute('aria-label', 'Redimensionar columna');
      resizer.style.touchAction = 'none';
      th.style.position = 'relative';
      th.appendChild(resizer);
      let startX = 0;
      let startW = 0;
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startW = th.offsetWidth;
        const onMove = (e2: MouseEvent) => {
          const dx = e2.clientX - startX;
          const newW = Math.max(60, startW + dx);
          th.style.width = `${newW}px`;
          th.style.minWidth = `${newW}px`;
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          columnWidths[col] = th.offsetWidth;
          localStorage.setItem(STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(columnWidths));
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  function reorderHeaderCells() {
    const thead = table?.querySelector('thead tr');
    if (!thead) return;
    const visibleOrdered = columnOrder.filter((c) => visibleColumns.includes(c));
    const cells = Array.from(thead.querySelectorAll<HTMLTableCellElement>('.pedidos-th'));
    const byCol = new Map(cells.map((th) => [th.dataset.column, th]));
    visibleOrdered.forEach((col) => {
      const th = byCol.get(col);
      if (th) thead.appendChild(th);
    });
  }

  function render() {
    const filtered = getFiltered();
    const total = filtered.length;
    const start = (page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);
    const visibleOrdered = columnOrder.filter((c) => visibleColumns.includes(c));

    applyColumnVisibility();
    tbody.innerHTML = pageRows
      .map((order) => renderRow(order, labels, badgeClass, visibleOrdered))
      .join('');

    summaryEl.textContent = `Mostrando ${Math.min(start + 1, total)} a ${Math.min(start + pageRows.length, total)} de ${total} pedidos (${rawOrders.length} cargados)`;

    paginationEl.innerHTML = `
      <button type="button" class="pedidos-page-prev rounded border border-zinc-300 px-3 py-1 text-sm ${page > 1 ? 'bg-white hover:bg-zinc-50' : 'cursor-not-allowed bg-zinc-100 opacity-50'}" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
      <span class="text-sm text-zinc-600">Página ${page} de ${Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
      <button type="button" class="pedidos-page-next rounded border border-zinc-300 px-3 py-1 text-sm ${start + pageRows.length < total ? 'bg-white hover:bg-zinc-50' : 'cursor-not-allowed bg-zinc-100 opacity-50'}" ${start + pageRows.length >= total ? 'disabled' : ''}>Siguiente</button>
    `;

    paginationEl.querySelector('.pedidos-page-prev')?.addEventListener('click', () => {
      if (page > 1) {
        page--;
        render();
      }
    });
    paginationEl.querySelector('.pedidos-page-next')?.addEventListener('click', () => {
      if (start + pageRows.length < total) {
        page++;
        render();
      }
    });

    updateSortIndicators();
    bindRowEvents();
  }

  function updateSortIndicators() {
    document.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
      const col = th.dataset.column;
      const sortBtn = th.querySelector('.pedidos-sort-btn');
      if (!sortBtn || !col) return;
      const idx = sort.findIndex((s) => s.column === col);
      const dir = idx >= 0 ? sort[idx].dir : null;
      const priority = idx >= 0 ? idx + 1 : null;
      sortBtn.textContent = dir === 'asc' ? ' ↑' : dir === 'desc' ? ' ↓' : ' ↕';
      if (priority !== null) sortBtn.setAttribute('title', `Orden ${priority}°`);
      else sortBtn.removeAttribute('title');
    });
    document.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
      const col = th.dataset.column;
      const filterBtn = th.querySelector('.pedidos-filter-btn');
      if (!filterBtn || !col) return;
      const hasFilter =
        (col === 'estado' && filters.status.length > 0) ||
        (col === 'fecha' && (filters.fechaDesde || filters.fechaHasta)) ||
        (col === 'cantidad' && (filters.cantidadMin !== '' || filters.cantidadMax !== '')) ||
        (col === 'id' && filters.q !== '') ||
        ((col === 'cliente' || col === 'producto' || col === 'notas') && (filters as Record<string, string>)[col] !== '');
      if (hasFilter) filterBtn.classList.add('text-zinc-800', 'font-semibold');
      else filterBtn.classList.remove('text-zinc-800', 'font-semibold');
    });
  }

  function bindRowEvents() {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );
    tbody.querySelectorAll<HTMLButtonElement>('.order-status-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const orderId = btn.dataset.orderId;
        const currentStatus = btn.dataset.currentStatus as OrderStatus | undefined;
        const nextStatus = btn.dataset.nextStatus as OrderStatus | undefined;
        if (!orderId || !nextStatus) return;
        if (currentStatus != null && !isTransitionAllowed(currentStatus, nextStatus)) {
          alert('Transición no permitida.');
          return;
        }
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
        if (error) {
          alert(`No se pudo actualizar estado: ${error.message}`);
          return;
        }
        window.location.reload();
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.ver-disenos-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cell = btn.closest('.design-cell');
        if (!cell) return;
        const urlsJson = cell.getAttribute('data-design-urls');
        const preview = cell.querySelector<HTMLElement>('.design-preview');
        if (!preview || !urlsJson) return;
        const expanded = btn.getAttribute('data-expanded') === 'true';
        if (expanded) {
          preview.classList.add('hidden');
          preview.innerHTML = '';
          btn.setAttribute('data-expanded', 'false');
          btn.textContent = 'Ver diseños';
          return;
        }
        try {
          const urls: string[] = JSON.parse(urlsJson);
          if (urls.length === 0) return;
          preview.innerHTML = '';
          urls.forEach((url) => {
            const img = document.createElement('img');
            img.className = 'mr-1 mt-1 inline-block h-14 w-14 rounded object-cover';
            img.src = url;
            img.alt = 'Diseño';
            img.loading = 'lazy';
            preview.appendChild(img);
          });
          preview.classList.remove('hidden');
          btn.setAttribute('data-expanded', 'true');
          btn.textContent = 'Ocultar';
        } catch {
          preview.textContent = 'No hay diseños';
          preview.classList.remove('hidden');
        }
      });
    });
  }

  // Quick filters (event delegation so chips always respond to clicks)
  const quickFiltersEl = document.getElementById('pedidos-quick-filters');
  if (quickFiltersEl) {
    const chips: { label: string; statuses: string[] }[] = [
      { label: 'Pendientes', statuses: ['pendiente_pago', 'falta_diseno', 'falta_imprimir'] },
      { label: 'En espera cliente', statuses: ['en_espera_cliente'] },
      { label: 'Con detalle', statuses: ['tiene_detalle'] },
      { label: 'Listos hoy', statuses: ['listo_para_impresion', 'empaquetada'] }
    ];
    quickFiltersEl.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="pedidos-chip cursor-pointer rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs transition-colors hover:bg-zinc-50" data-statuses="${escapeAttr(JSON.stringify(c.statuses))}">${escapeHtml(c.label)}</button>`
      )
      .join('');
    quickFiltersEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.pedidos-chip');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const statusesJson = btn.dataset.statuses;
      if (!statusesJson) return;
      try {
        const statuses: string[] = JSON.parse(statusesJson);
        const isActive = statuses.length > 0 && statuses.every((s) => filters.status.includes(s));
        if (isActive) {
          filters.status = filters.status.filter((s) => !statuses.includes(s));
          btn.classList.remove('bg-zinc-800', 'text-white');
          btn.classList.add('border-zinc-300', 'bg-white');
        } else {
          statuses.forEach((s) => {
            if (!filters.status.includes(s)) filters.status.push(s);
          });
          btn.classList.add('bg-zinc-800', 'text-white');
          btn.classList.remove('border-zinc-300', 'bg-white');
        }
        page = 1;
        render();
      } catch (_) {}
    });
  }

  // Filter dropdowns: open on .pedidos-filter-btn click
  document.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
    const col = th.dataset.column;
    const type = th.dataset.type;
    const filterBtn = th.querySelector('.pedidos-filter-btn');
    if (!filterBtn || !col) return;
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('pedidos-filter-dropdown');
      if (existing) {
        (existing as HTMLElement & { __close?: () => void }).__close?.();
        existing.remove();
        if (existing.dataset.column === col) return;
      }
      const drop = document.createElement('div');
      drop.id = 'pedidos-filter-dropdown';
      drop.dataset.column = col;
      drop.className = 'absolute z-30 min-w-[200px] rounded-lg border border-zinc-200 bg-white p-3 shadow-lg';
      const rect = (filterBtn as HTMLElement).getBoundingClientRect();
      drop.style.position = 'fixed';
      drop.style.top = `${rect.bottom + 4}px`;
      drop.style.left = `${rect.left}px`;

      if (type === 'status' && data.statusGroups) {
        const g = data.statusGroups;
        const allStatuses = [...g.activos, ...g.espera, ...g.finales];
        drop.innerHTML = `
          <p class="mb-2 text-xs font-medium text-zinc-500">Activos</p>
          <div class="mb-2 max-h-32 overflow-y-auto">${g.activos.map((s) => `<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-50"><input type="checkbox" class="pedidos-filter-status" value="${escapeHtml(s)}" ${filters.status.includes(s) ? 'checked' : ''}/><span class="text-xs">${escapeHtml(labels[s] ?? s)}</span></label>`).join('')}</div>
          <p class="mb-2 text-xs font-medium text-zinc-500">En espera</p>
          <div class="mb-2">${g.espera.map((s) => `<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-50"><input type="checkbox" class="pedidos-filter-status" value="${escapeHtml(s)}" ${filters.status.includes(s) ? 'checked' : ''}/><span class="text-xs">${escapeHtml(labels[s] ?? s)}</span></label>`).join('')}</div>
          <p class="mb-2 text-xs font-medium text-zinc-500">Finales</p>
          <div class="mb-2">${g.finales.map((s) => `<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-50"><input type="checkbox" class="pedidos-filter-status" value="${escapeHtml(s)}" ${filters.status.includes(s) ? 'checked' : ''}/><span class="text-xs">${escapeHtml(labels[s] ?? s)}</span></label>`).join('')}</div>
          <div class="flex gap-1 border-t border-zinc-100 pt-2"><button type="button" class="pedidos-filter-select-all rounded border border-zinc-300 px-2 py-1 text-xs">Todo</button><button type="button" class="pedidos-filter-clear rounded border border-zinc-300 px-2 py-1 text-xs">Limpiar</button><button type="button" class="pedidos-filter-apply ml-auto rounded bg-zinc-800 px-2 py-1 text-xs text-white">Aplicar</button></div>
        `;
        drop.querySelector('.pedidos-filter-select-all')?.addEventListener('click', () => drop.querySelectorAll<HTMLInputElement>('.pedidos-filter-status').forEach((cb) => { cb.checked = true; }));
        drop.querySelector('.pedidos-filter-clear')?.addEventListener('click', () => { drop.querySelectorAll<HTMLInputElement>('.pedidos-filter-status').forEach((cb) => { cb.checked = false; }); });
        drop.querySelector('.pedidos-filter-apply')?.addEventListener('click', () => {
          filters.status = Array.from(drop.querySelectorAll<HTMLInputElement>('.pedidos-filter-status:checked')).map((cb) => cb.value);
          page = 1;
          render();
          drop.remove();
        });
      } else if (type === 'date') {
        const today = new Date();
        const toYMD = (d: Date) => d.toISOString().slice(0, 10);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        drop.innerHTML = `
          <div class="space-y-1">
            <button type="button" class="pedidos-date-preset block w-full rounded px-2 py-1 text-left text-xs hover:bg-zinc-50" data-from="${toYMD(today)}" data-to="${toYMD(today)}">Hoy</button>
            <button type="button" class="pedidos-date-preset block w-full rounded px-2 py-1 text-left text-xs hover:bg-zinc-50" data-from="${toYMD(weekStart)}" data-to="${toYMD(today)}">Esta semana</button>
            <button type="button" class="pedidos-date-preset block w-full rounded px-2 py-1 text-left text-xs hover:bg-zinc-50" data-from="${toYMD(new Date(today.getFullYear(), today.getMonth(), 1))}" data-to="${toYMD(today)}">Este mes</button>
          </div>
          <div class="mt-2 flex gap-1 border-t border-zinc-100 pt-2">
            <input type="date" class="pedidos-date-from rounded border border-zinc-300 px-2 py-1 text-xs" value="${filters.fechaDesde}" />
            <input type="date" class="pedidos-date-to rounded border border-zinc-300 px-2 py-1 text-xs" value="${filters.fechaHasta}" />
          </div>
          <div class="mt-2 flex gap-1"><button type="button" class="pedidos-filter-clear rounded border border-zinc-300 px-2 py-1 text-xs">Limpiar</button><button type="button" class="pedidos-filter-apply rounded bg-zinc-800 px-2 py-1 text-xs text-white">Aplicar</button></div>
        `;
        drop.querySelectorAll('.pedidos-date-preset').forEach((btn) => {
          btn.addEventListener('click', () => {
            const b = btn as HTMLElement;
            (drop.querySelector('.pedidos-date-from') as HTMLInputElement).value = b.dataset.from ?? '';
            (drop.querySelector('.pedidos-date-to') as HTMLInputElement).value = b.dataset.to ?? '';
          });
        });
        drop.querySelector('.pedidos-filter-clear')?.addEventListener('click', () => {
          (drop.querySelector('.pedidos-date-from') as HTMLInputElement).value = '';
          (drop.querySelector('.pedidos-date-to') as HTMLInputElement).value = '';
        });
        drop.querySelector('.pedidos-filter-apply')?.addEventListener('click', () => {
          filters.fechaDesde = (drop.querySelector('.pedidos-date-from') as HTMLInputElement).value;
          filters.fechaHasta = (drop.querySelector('.pedidos-date-to') as HTMLInputElement).value;
          page = 1;
          render();
          drop.remove();
        });
      } else if (type === 'number' && col === 'cantidad') {
        drop.innerHTML = `
          <div class="flex gap-2">
            <label class="text-xs">Mín <input type="number" class="pedidos-cant-min w-20 rounded border border-zinc-300 px-2 py-1 text-xs" value="${filters.cantidadMin === '' ? '' : filters.cantidadMin}" min="0" /></label>
            <label class="text-xs">Máx <input type="number" class="pedidos-cant-max w-20 rounded border border-zinc-300 px-2 py-1 text-xs" value="${filters.cantidadMax === '' ? '' : filters.cantidadMax}" min="0" /></label>
          </div>
          <div class="mt-2 flex gap-1"><button type="button" class="pedidos-filter-clear rounded border border-zinc-300 px-2 py-1 text-xs">Limpiar</button><button type="button" class="pedidos-filter-apply rounded bg-zinc-800 px-2 py-1 text-xs text-white">Aplicar</button></div>
        `;
        drop.querySelector('.pedidos-filter-clear')?.addEventListener('click', () => {
          (drop.querySelector('.pedidos-cant-min') as HTMLInputElement).value = '';
          (drop.querySelector('.pedidos-cant-max') as HTMLInputElement).value = '';
        });
        drop.querySelector('.pedidos-filter-apply')?.addEventListener('click', () => {
          const min = (drop.querySelector('.pedidos-cant-min') as HTMLInputElement).value;
          const max = (drop.querySelector('.pedidos-cant-max') as HTMLInputElement).value;
          filters.cantidadMin = min === '' ? '' : parseInt(min, 10);
          filters.cantidadMax = max === '' ? '' : parseInt(max, 10);
          page = 1;
          render();
          drop.remove();
        });
      } else if (type === 'text') {
        const filterVal = col === 'id' ? filters.q : ((filters as Record<string, string>)[col] ?? '');
        drop.innerHTML = `
          <input type="text" class="pedidos-filter-text w-full rounded border border-zinc-300 px-2 py-1 text-xs" placeholder="Contiene..." value="${escapeHtml(filterVal)}" />
          <div class="mt-2 flex gap-1"><button type="button" class="pedidos-filter-clear rounded border border-zinc-300 px-2 py-1 text-xs">Limpiar</button><button type="button" class="pedidos-filter-apply rounded bg-zinc-800 px-2 py-1 text-xs text-white">Aplicar</button></div>
        `;
        drop.querySelector('.pedidos-filter-clear')?.addEventListener('click', () => {
          (drop.querySelector('.pedidos-filter-text') as HTMLInputElement).value = '';
        });
        drop.querySelector('.pedidos-filter-apply')?.addEventListener('click', () => {
          const val = (drop.querySelector('.pedidos-filter-text') as HTMLInputElement).value.trim();
          if (col === 'id') filters.q = val;
          else (filters as Record<string, string>)[col] = val;
          const searchInput = document.getElementById('pedidos-search') as HTMLInputElement | null;
          if (col === 'id' && searchInput) searchInput.value = val;
          page = 1;
          render();
          drop.remove();
        });
      } else {
        drop.remove();
        return;
      }
      document.body.appendChild(drop);
      drop.addEventListener('click', (e) => e.stopPropagation());
      drop.addEventListener('mousedown', (e) => e.stopPropagation());
      const close = () => {
        drop.remove();
        document.removeEventListener('mousedown', close);
      };
      (drop as HTMLElement & { __close?: () => void }).__close = close;
      setTimeout(() => document.addEventListener('mousedown', close), 0);
    });
  });

  // Column drag-and-drop reorder
  let draggedColumn: string | null = null;
  table?.querySelectorAll<HTMLTableCellElement>('.pedidos-th').forEach((th) => {
    const col = th.dataset.column;
    if (!col) return;
    th.draggable = true;
    th.setAttribute('aria-label', `Columna ${columnLabels[col] ?? col}, arrastrar para reordenar`);
    th.addEventListener('dragstart', (e) => {
      draggedColumn = col;
      e.dataTransfer?.setData('text/plain', col);
      th.classList.add('opacity-50');
    });
    th.addEventListener('dragend', () => {
      th.classList.remove('opacity-50');
      draggedColumn = null;
    });
    th.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedColumn && draggedColumn !== col) th.classList.add('ring', 'ring-zinc-300');
    });
    th.addEventListener('dragleave', () => th.classList.remove('ring', 'ring-zinc-300'));
    th.addEventListener('drop', (e) => {
      e.preventDefault();
      th.classList.remove('ring', 'ring-zinc-300');
      const from = draggedColumn;
      if (!from || from === col) return;
      const idxFrom = columnOrder.indexOf(from);
      const idxTo = columnOrder.indexOf(col);
      if (idxFrom === -1 || idxTo === -1) return;
      const next = [...columnOrder];
      next.splice(idxFrom, 1);
      next.splice(idxTo, 0, from);
      columnOrder = next;
      localStorage.setItem(STORAGE_KEY_COLUMN_ORDER, JSON.stringify(columnOrder));
      applyColumnVisibility();
      render();
    });
  });

  // Sort: cycle asc -> desc -> none on th click
  document.querySelectorAll<HTMLTableCellElement>('.pedidos-th[data-sortable="true"]').forEach((th) => {
    const col = th.dataset.column;
    if (!col) return;
    const sortBtn = th.querySelector('.pedidos-sort-btn');
    sortBtn?.addEventListener('click', () => {
      const idx = sort.findIndex((s) => s.column === col);
      const current = idx >= 0 ? sort[idx].dir : null;
      if (current === 'asc') {
        sort[idx] = { column: col, dir: 'desc' };
      } else if (current === 'desc') {
        sort.splice(idx, 1);
      } else {
        sort.push({ column: col, dir: 'asc' });
      }
      page = 1;
      render();
    });
  });

  // Search with debounce
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  document.getElementById('pedidos-search')?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value.trim();
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      filters.q = value;
      page = 1;
      render();
      searchDebounce = null;
    }, 350);
  });

  if (dropVistas) {
    dropVistas.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('button');
      if (!target) return;
      if (target.classList.contains('pedidos-preset-save')) {
        const name = window.prompt('Nombre de la vista');
        if (name?.trim()) {
          savePreset(name.trim());
          dropVistas.classList.add('hidden');
          btnVistas?.setAttribute('aria-expanded', 'false');
        }
        return;
      }
      if (target.classList.contains('pedidos-preset-apply')) {
        const idx = parseInt((target as HTMLButtonElement).dataset.presetIndex ?? '-1', 10);
        const list = getPresets();
        const p = list[idx];
        if (p) {
          if (p.filters && typeof p.filters === 'object') {
            if (Array.isArray(p.filters.status)) filters.status = [...p.filters.status];
            if (typeof p.filters.q === 'string') filters.q = p.filters.q;
            if (typeof p.filters.cliente === 'string') filters.cliente = p.filters.cliente;
            if (typeof p.filters.producto === 'string') filters.producto = p.filters.producto;
            if (typeof p.filters.notas === 'string') filters.notas = p.filters.notas;
            if (typeof p.filters.fechaDesde === 'string') filters.fechaDesde = p.filters.fechaDesde;
            if (typeof p.filters.fechaHasta === 'string') filters.fechaHasta = p.filters.fechaHasta;
            if (p.filters.cantidadMin !== undefined && p.filters.cantidadMin !== '') filters.cantidadMin = p.filters.cantidadMin as number;
            else filters.cantidadMin = '';
            if (p.filters.cantidadMax !== undefined && p.filters.cantidadMax !== '') filters.cantidadMax = p.filters.cantidadMax as number;
            else filters.cantidadMax = '';
          }
          if (Array.isArray(p.sort)) sort = p.sort.map((s) => ({ ...s }));
          if (Array.isArray(p.visibleColumns) && p.visibleColumns.length > 0) visibleColumns = [...p.visibleColumns];
          if (Array.isArray(p.columnOrder) && p.columnOrder.length > 0) columnOrder = [...p.columnOrder];
          if (p.columnWidths && typeof p.columnWidths === 'object') columnWidths = { ...p.columnWidths };
          localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(visibleColumns));
          localStorage.setItem(STORAGE_KEY_COLUMN_ORDER, JSON.stringify(columnOrder));
          localStorage.setItem(STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(columnWidths));
          page = 1;
          const searchInput = document.getElementById('pedidos-search') as HTMLInputElement | null;
          if (searchInput) searchInput.value = filters.q;
          render();
        }
        dropVistas.classList.add('hidden');
        btnVistas?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (dropColumnas) {
    dropColumnas.addEventListener('change', (ev) => {
      const input = ev.target as HTMLInputElement;
      if (!input.classList.contains('pedidos-col-toggle')) return;
      const c = input.dataset.column!;
      if (input.checked) visibleColumns = [...visibleColumns, c].filter((x) => DEFAULT_COLUMNS.includes(x));
      else visibleColumns = visibleColumns.filter((x) => x !== c);
      if (visibleColumns.length === 0) visibleColumns = [...DEFAULT_COLUMNS];
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(visibleColumns));
      render();
    });
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
