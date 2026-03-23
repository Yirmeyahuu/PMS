import React, { useState } from 'react';
import {
  Plus, Search, Filter, RefreshCw, Package, AlertTriangle,
} from 'lucide-react';
import {
  useProducts,
  useInventoryStats,
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useRestoreProduct,
  useAdjustStock,
  useProduct,
} from './hooks/useInventory';
import { InventoryStatsBar } from './components/InventoryStats';
import { ProductFormModal }  from './components/ProductFormModal';
import { StockAdjustModal }  from './components/StockAdjustModal';
import { ProductTable }      from './components/ProductTable';
import type {
  ProductListItem, ProductFilters,
  CreateProductPayload, StockAdjustmentPayload,
} from '@/types/inventory';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit';   product: ProductListItem }
  | { type: 'adjust'; product: ProductListItem };

export const Inventory: React.FC = () => {
  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters]       = useState<ProductFilters>({ is_archived: false, page: 1, page_size: 20 });
  const [search, setSearch]         = useState('');
  const [ordering, setOrdering]     = useState('name');
  const [showArchived, setShowArchived] = useState(false);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const editId = modal.type === 'edit' ? modal.product.id : 0;
  const { data: editProduct } = useProduct(editId);

  // ── Queries ───────────────────────────────────────────────────────────────
  const activeFilters: ProductFilters = {
    ...filters,
    search:      search || undefined,
    ordering,
    is_archived: showArchived,
  };

  const { data: productsPage, isLoading, refetch } = useProducts(activeFilters);
  const { data: stats }                             = useInventoryStats();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation  = useCreateProduct();
  const updateMutation  = useUpdateProduct(editId);
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();

  const adjustProductId = modal.type === 'adjust' ? modal.product.id : 0;
  const adjustMutation  = useAdjustStock(adjustProductId);

  const products = productsPage?.results ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOrder = (field: string) =>
    setOrdering(prev => prev === field ? `-${field}` : field);

  const handleCreate = (data: CreateProductPayload) =>
    createMutation.mutate(data, { onSuccess: () => setModal({ type: 'none' }) });

  const handleUpdate = (data: CreateProductPayload) =>
    updateMutation.mutate(data, { onSuccess: () => setModal({ type: 'none' }) });

  const handleAdjust = (payload: StockAdjustmentPayload) =>
    adjustMutation.mutate(payload, { onSuccess: () => setModal({ type: 'none' }) });

  const handleArchive = (p: ProductListItem) => {
    if (!confirm(`Archive "${p.name}"? It will no longer appear in active lists.`)) return;
    archiveMutation.mutate(p.id);
  };

  const handleRestore = (p: ProductListItem) => restoreMutation.mutate(p.id);

  const formError = (err: unknown) => {
    const data = (err as any)?.response?.data;
    if (!data) return null;
    if (typeof data === 'string') return data;
    return Object.values(data).flat().join(' ');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
            <p className="text-xs text-gray-400">Manage products, supplies and service items</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && <InventoryStatsBar stats={stats} />}

      {/* ── Low stock banner ── */}
      {stats && stats.low_stock_count > 0 && !showArchived && (
        <div
          className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setFilters((f: ProductFilters) => ({ ...f, low_stock: true }))}
        >
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 font-medium">
            {stats.low_stock_count} item{stats.low_stock_count > 1 ? 's are' : ' is'} running low on stock.
            <span className="underline ml-1">View low stock items</span>
          </span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setFilters((f: ProductFilters) => ({ ...f, page: 1 })); }}
            placeholder="Search by name, SKU, barcode…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
          />
        </div>

        {/* Toggle archived */}
        <button
          onClick={() => { setShowArchived(v => !v); setFilters((f: ProductFilters) => ({ ...f, page: 1 })); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showArchived
              ? 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>

        {/* Clear low-stock filter chip */}
        {filters.low_stock && (
          <button
            onClick={() => setFilters((f: ProductFilters) => ({ ...f, low_stock: undefined }))}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Low Stock Only ×
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading inventory…
        </div>
      ) : (
        <ProductTable
          products={products}
          ordering={ordering}
          onOrder={handleOrder}
          onEdit={p    => setModal({ type: 'edit',   product: p })}
          onAdjust={p  => setModal({ type: 'adjust', product: p })}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* ── Pagination ── */}
      {productsPage && productsPage.count > (filters.page_size ?? 20) && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {products.length} of {productsPage.count} products
          </span>
          <div className="flex gap-2">
            <button
              disabled={!productsPage.previous}
              onClick={() => setFilters((f: ProductFilters) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Previous
            </button>
            <button
              disabled={!productsPage.next}
              onClick={() => setFilters((f: ProductFilters) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <ProductFormModal
        isOpen={modal.type === 'create' || modal.type === 'edit'}
        onClose={() => setModal({ type: 'none' })}
        product={modal.type === 'edit' ? (editProduct ?? null) : null}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={formError(createMutation.error ?? updateMutation.error)}
        onSubmit={modal.type === 'edit' ? handleUpdate : handleCreate}
      />

      {/* ── Stock Adjust Modal ── */}
      <StockAdjustModal
        isOpen={modal.type === 'adjust'}
        onClose={() => setModal({ type: 'none' })}
        product={modal.type === 'adjust' ? modal.product : null}
        isLoading={adjustMutation.isPending}
        error={formError(adjustMutation.error)}
        onSubmit={handleAdjust}
      />
    </div>
  );
};