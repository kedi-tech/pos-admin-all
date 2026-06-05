const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── token helpers ─────────────────────────────────────────────
export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('asg-token') : null;
}
export function setToken(t) { localStorage.setItem('asg-token', t); }
export function clearToken() { localStorage.removeItem('asg-token'); }

// ── base fetch ────────────────────────────────────────────────
async function req(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const get  = (path)        => req('GET',    path);
const post = (path, body)  => req('POST',   path, body);
const patch = (path, body) => req('PATCH',  path, body);

// ── mappers ───────────────────────────────────────────────────
export function mapProduct(p) {
  const primaryBc = p.barcodes?.find(b => b.isPrimary) || p.barcodes?.[0];
  const stock = p.productStocks?.[0]?.quantityOnHand ?? 0;
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    cat: p.categoryId,
    price: Number(p.sellingPrice),
    cost: Number(p.costPrice),
    taxRate: Number(p.taxRate ?? 0),
    stock,
    min: p.reorderLevel,
    barcodes: p.barcodes?.map(b => b.barcode) ?? [],
    primary: primaryBc?.barcode || '',
    internal: p.barcodes?.some(b => b.source === 'internal') ?? false,
    active: p.isActive,
    updated: p.updatedAt?.slice(0, 10) || '',
    categoryName: p.category?.name || '',
    imageUrl: p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : `${BASE}${p.imageUrl}`) : '',
  };
}

function mapCategory(c) {
  return { id: c.id, name: c.name, description: c.description || '', isActive: c.isActive };
}

function mapUser(u) {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    phone: u.phone || '',
    role: u.role?.name || '',
    roleId: u.roleId,
    branch: u.branch?.name || 'All branches',
    branchId: u.branchId || null,
    active: u.isActive,
    lastLogin: 'Never',
    added: u.createdAt?.slice(0, 10) || '',
  };
}

function mapRole(r) {
  const colorMap = { Admin: 'accent', Manager: 'info', Cashier: 'success', Scanner: 'warning' };
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    color: colorMap[r.name] || 'info',
    users: 0,
    perms: r.rolePermissions?.map(rp => rp.permission?.description).filter(Boolean).join(', ') || '',
  };
}

function mapSale(s) {
  const methodMap = { cash: 'Cash', orange_money: 'Orange Money', card: 'Card', bank_transfer: 'Bank Transfer', mixed: 'Mixed' };
  return {
    id: s.saleNumber || s.id,
    saleId: s.id,
    time: s.createdAt?.slice(0, 16).replace('T', ' ') || '',
    cashier: s.cashier?.fullName || '—',
    branch: s.branchId,
    items: s._count?.saleItems || s.saleItems?.length || 0,
    total: Number(s.grandTotal),
    payment: methodMap[s.payments?.[0]?.paymentMethod] || '—',
    status: s.saleStatus === 'completed' ? 'Completed' : s.saleStatus === 'refunded' ? 'Refunded' : 'Cancelled',
  };
}

function mapMovement(m) {
  const incoming = ['stock_in', 'return_in', 'adjustment_in', 'transfer_in'].includes(m.movementType);
  const typeMap = {
    stock_in: 'stock_in', sale_out: 'stock_out', return_in: 'return_in',
    adjustment_in: 'adjustment', adjustment_out: 'adjustment',
    damaged_out: 'damaged_out', transfer_in: 'stock_in', transfer_out: 'stock_out',
  };
  return {
    id: 'M-' + m.id.slice(-5).toUpperCase(),
    time: m.createdAt?.slice(0, 16).replace('T', ' ') || '',
    type: typeMap[m.movementType] || m.movementType,
    product: m.product?.name || '—',
    sku: m.product?.sku || '—',
    qty: incoming ? m.quantity : -m.quantity,
    reason: m.reason || '—',
    by: m.createdBy?.fullName || '—',
  };
}

// ── auth ──────────────────────────────────────────────────────
export async function login(email, password) {
  const data = await post('/api/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export async function getMe() {
  return get('/api/auth/me');
}

export function logout() {
  clearToken();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

export async function changePassword(newPassword) {
  return post('/api/auth/change-password', { newPassword });
}

// ── upload ────────────────────────────────────────────────────
export function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = await post('/api/upload', { data: e.target.result, name: file.name });
        // data.url is relative ('/uploads/…') — prefix with backend BASE so it works cross-origin
        const url = data.url.startsWith('http') ? data.url : `${BASE}${data.url}`;
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── products ──────────────────────────────────────────────────
export async function getProducts() {
  const data = await get('/api/products');
  return data.map(mapProduct);
}

export async function createProduct(p, branchId) {
  const created = await post('/api/products', {
    name: p.name, sku: p.sku, categoryId: p.cat,
    costPrice: p.cost, sellingPrice: p.price,
    reorderLevel: p.min, isActive: p.active,
    taxRate: p.taxRate ?? 0,
    imageUrl: p.imageUrl || undefined,
  });
  for (const barcode of p.barcodes) {
    await post(`/api/products/${created.id}/barcodes`, {
      barcode,
      barcodeType: barcode.startsWith('ASG-') ? 'CODE128' : (barcode.length === 13 ? 'EAN13' : barcode.length === 8 ? 'EAN8' : 'CODE128'),
      source: barcode.startsWith('ASG-') ? 'internal' : 'original',
      isPrimary: barcode === p.primary,
    });
  }
  if (p.stock > 0 && branchId) {
    await post('/api/inventory/adjust', {
      productId: created.id, branchId,
      quantity: p.stock, movementType: 'stock_in',
      reason: 'Initial stock',
    });
  }
  const full = await get(`/api/products/${created.id}`);
  return mapProduct(full);
}

export async function updateProduct(p) {
  if (!p.id || p.id === 'undefined') throw new Error('Cannot update product without a valid ID');
  await patch(`/api/products/${p.id}`, {
    name: p.name, categoryId: p.cat,
    costPrice: p.cost, sellingPrice: p.price,
    reorderLevel: p.min, isActive: p.active,
    taxRate: p.taxRate ?? 0,
    imageUrl: p.imageUrl ?? undefined,
  });
  const full = await get(`/api/products/${p.id}`);
  return mapProduct(full);
}

export async function deleteProduct(id) {
  return req('DELETE', `/api/products/${id}`);
}

// ── categories ────────────────────────────────────────────────
export async function getCategories() {
  const data = await get('/api/products/meta/categories');
  return data.map(mapCategory);
}

export async function createCategory(name) {
  const data = await post('/api/products/meta/categories', { name });
  return mapCategory(data);
}

// ── branches ─────────────────────────────────────────────────
export async function getBranches() {
  return get('/api/branches');
}

export async function addBarcode(productId, { barcode, barcodeType, source, isPrimary }) {
  return post(`/api/products/${productId}/barcodes`, { barcode, barcodeType, source, isPrimary });
}

export async function createBranch(data) {
  return post('/api/branches', data);
}

export async function updateBranch(id, data) {
  return patch(`/api/branches/${id}`, data);
}

// ── users ─────────────────────────────────────────────────────
export async function getUsers() {
  const data = await get('/api/users');
  return data.map(mapUser);
}

export async function createUser(u) {
  const data = await post('/api/users', {
    fullName: u.name, email: u.email, phone: u.phone || undefined,
    password: u.password, roleId: u.roleId, branchId: u.branchId || null,
  });
  return mapUser(data);
}

export async function updateUser(u) {
  const data = await patch(`/api/users/${u.id}`, {
    fullName: u.name, email: u.email, phone: u.phone || undefined,
    roleId: u.roleId, branchId: u.branchId || null, isActive: u.active,
  });
  return mapUser(data);
}

export async function deleteUser(id) {
  return req('DELETE', `/api/users/${id}`);
}

export async function getRoles() {
  const data = await get('/api/users/roles');
  return data.map(mapRole);
}

// ── inventory ─────────────────────────────────────────────────
export async function adjustInventory({ productId, branchId, quantity, movementType, reason }) {
  return post('/api/inventory/adjust', { productId, branchId, quantity, movementType, reason });
}

export async function getMovements(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await get(`/api/inventory/movements?${qs}`);
  return data.map(mapMovement);
}

// ── sales ─────────────────────────────────────────────────────
export async function getSales(params = {}) {
  const qs = new URLSearchParams({ limit: 100, ...params }).toString();
  const data = await get(`/api/sales?${qs}`);
  return data.map(mapSale);
}

export async function getSaleById(id) {
  return get(`/api/sales/${id}`);
}

// ── reports ──────────────────────────────────────────────────
export async function getReportSalesSummary(params = {}) {
  return get(`/api/reports/sales-summary?${new URLSearchParams(params)}`);
}
export async function getReportTopProducts(params = {}) {
  return get(`/api/reports/top-products?${new URLSearchParams(params)}`);
}
export async function getReportCashierPerf(params = {}) {
  return get(`/api/reports/cashier-performance?${new URLSearchParams(params)}`);
}
export async function getReportStockSummary(params = {}) {
  return get(`/api/reports/stock-summary?${new URLSearchParams(params)}`);
}
export async function getReportProfit(params = {}) {
  return get(`/api/reports/profit?${new URLSearchParams(params)}`);
}
export async function getReportDailyRevenue(params = {}) {
  return get(`/api/reports/daily-revenue?${new URLSearchParams(params)}`);
}
