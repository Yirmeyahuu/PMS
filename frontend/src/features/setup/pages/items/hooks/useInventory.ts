import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, categoryApi, stockMovementApi } from '../services/inventory.api';
import type { CreateProductPayload, StockAdjustmentPayload, ProductFilters } from '@/types/inventory';

export const INVENTORY_KEYS = {
  all:        ['inventory-products']             as const,
  list:       (f: ProductFilters) => ['inventory-products', 'list', f] as const,
  detail:     (id: number)        => ['inventory-products', 'detail', id] as const,
  stats:      ()                  => ['inventory-products', 'stats'] as const,
  categories: ()                  => ['inventory-categories'] as const,
  movements:  (id?: number)       => ['inventory-stock-movements', id] as const,
};

export const useProducts = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: INVENTORY_KEYS.list(filters),
    queryFn:  () => productApi.list(filters),
  });

export const useProduct = (id: number) =>
  useQuery({
    queryKey: INVENTORY_KEYS.detail(id),
    queryFn:  () => productApi.getById(id),
    enabled:  !!id,
  });

export const useInventoryStats = () =>
  useQuery({
    queryKey: INVENTORY_KEYS.stats(),
    queryFn:  productApi.stats,
  });

export const useCategories = () =>
  useQuery({
    queryKey: INVENTORY_KEYS.categories(),
    queryFn:  categoryApi.list,
  });

export const useStockMovements = (productId?: number) =>
  useQuery({
    queryKey: INVENTORY_KEYS.movements(productId),
    queryFn:  () => stockMovementApi.list(productId),
    enabled:  !!productId,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productApi.create(payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.stats() });
    },
  });
};

export const useUpdateProduct = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateProductPayload>) => productApi.update(id, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.stats() });
    },
  });
};

export const useArchiveProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productApi.archive(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.stats() });
    },
  });
};

export const useRestoreProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productApi.restore(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.stats() });
    },
  });
};

export const useAdjustStock = (productId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockAdjustmentPayload) => productApi.adjustStock(productId, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.detail(productId) });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.movements(productId) });
      qc.invalidateQueries({ queryKey: INVENTORY_KEYS.stats() });
    },
  });
};