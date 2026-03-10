import axiosInstance from '@/lib/axios';
import type {
  Category,
  Product,
  ProductListItem,
  StockMovement,
  CreateProductPayload,
  StockAdjustmentPayload,
  InventoryStats,
  ProductFilters,
} from '@/types/inventory';

interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const res = await axiosInstance.get('/inventory/categories/');
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },
  create: async (data: Partial<Category>): Promise<Category> => {
    const res = await axiosInstance.post('/inventory/categories/', data);
    return res.data;
  },
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productApi = {
  list: async (
    filters: ProductFilters = {},
  ): Promise<PaginatedResponse<ProductListItem>> => {
    const params: Record<string, string | number | boolean> = {};
    if (filters.search)      params.search       = filters.search;
    if (filters.category)    params.category     = filters.category;
    if (filters.item_type)   params.item_type    = filters.item_type;
    if (filters.is_archived !== undefined) params.is_archived = filters.is_archived;
    if (filters.low_stock)   params.low_stock    = true;
    if (filters.ordering)    params.ordering     = filters.ordering;
    params.page      = filters.page      ?? 1;
    params.page_size = filters.page_size ?? 20;

    const res = await axiosInstance.get('/inventory/products/', { params });
    if (Array.isArray(res.data)) {
      return { count: res.data.length, next: null, previous: null, results: res.data };
    }
    return res.data;
  },

  getById: async (id: number): Promise<Product> => {
    const res = await axiosInstance.get(`/inventory/products/${id}/`);
    return res.data;
  },

  create: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await axiosInstance.post('/inventory/products/', payload);
    return res.data;
  },

  update: async (id: number, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const res = await axiosInstance.patch(`/inventory/products/${id}/`, payload);
    return res.data;
  },

  archive: async (id: number): Promise<Product> => {
    const res = await axiosInstance.post(`/inventory/products/${id}/archive/`);
    return res.data;
  },

  restore: async (id: number): Promise<Product> => {
    const res = await axiosInstance.post(`/inventory/products/${id}/restore/`);
    return res.data;
  },

  adjustStock: async (id: number, payload: StockAdjustmentPayload): Promise<Product> => {
    const res = await axiosInstance.post(`/inventory/products/${id}/adjust_stock/`, payload);
    return res.data;
  },

  stats: async (): Promise<InventoryStats> => {
    const res = await axiosInstance.get('/inventory/products/stats/');
    return res.data;
  },
};

// ── Stock Movements ───────────────────────────────────────────────────────────
export const stockMovementApi = {
  list: async (productId?: number): Promise<StockMovement[]> => {
    const params = productId ? { product: productId } : {};
    const res    = await axiosInstance.get('/inventory/stock-movements/', { params });
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },
};