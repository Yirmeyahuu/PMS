export type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY';
export type UnitType = 'PCS' | 'BOX' | 'BOTTLE' | 'PACK' | 'VIAL' | 'TUBE' | 'ML' | 'MG' | 'G' | 'OTHER';
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export interface Category {
  id:          number;
  name:        string;
  description: string;
  is_active:   boolean;
  clinic:      number;
  created_at:  string;
  updated_at:  string;
}

export interface Product {
  id:                number;
  name:              string;
  sku:               string;
  barcode:           string;
  description:       string;
  item_type:         ItemType;
  category:          number | null;
  category_name:     string | null;
  cost_price:        string;
  selling_price:     string;
  unit:              UnitType;
  quantity_in_stock: string;
  reorder_level:     string;
  is_active:         boolean;
  is_archived:       boolean;
  is_low_stock:      boolean;
  stock_value:       string;
  created_by:        number | null;
  created_by_name:   string | null;
  clinic:            number;
  created_at:        string;
  updated_at:        string;
}

export interface ProductListItem {
  id:                number;
  name:              string;
  sku:               string;
  item_type:         ItemType;
  category:          number | null;
  category_name:     string | null;
  selling_price:     string;
  quantity_in_stock: string;
  unit:              UnitType;
  reorder_level:     string;
  is_low_stock:      boolean;
  is_active:         boolean;
  is_archived:       boolean;
  created_by:        number | null;
  created_by_name:   string | null;
  modified_by:       number | null;
  modified_by_name:  string | null;
}

export interface StockMovement {
  id:               number;
  product:          number;
  product_name:     string;
  movement_type:    MovementType;
  quantity:         string;
  quantity_before:  string;
  quantity_after:   string;
  reference:        string;
  notes:            string;
  performed_by:     number | null;
  performed_by_name: string | null;
  created_at:       string;
}

export interface CreateProductPayload {
  name:              string;
  sku?:              string;
  barcode?:          string;
  description?:      string;
  item_type:         ItemType;
  category?:         number | null;
  cost_price:        string;
  selling_price:     string;
  unit:              UnitType;
  quantity_in_stock?: string;
  reorder_level?:    string;
  is_active?:        boolean;
}

export interface StockAdjustmentPayload {
  movement_type: MovementType;
  quantity:      string;
  reference?:    string;
  notes?:        string;
}

export interface InventoryStats {
  total_products:    number;
  total_active:      number;
  total_archived:    number;
  low_stock_count:   number;
  total_stock_value: string;
}

export interface ProductFilters {
  search?:      string;
  category?:    number;
  item_type?:   ItemType;
  is_active?:   boolean;
  is_archived?: boolean;
  low_stock?:   boolean;
  ordering?:    string;
  page?:        number;
  page_size?:   number;
}