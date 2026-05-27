export type RoleCode = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
export type MovementType = "OPENING" | "RECEIVE" | "ISSUE" | "ADJUST_IN" | "ADJUST_OUT" | "TRANSFER_IN" | "TRANSFER_OUT";

export interface BaseEntity {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  is_deleted: boolean;
}

export interface Unit extends BaseEntity {
  unit_code: string;
  unit_name: string;
  description: string | null;
  active: boolean;
}

export interface StorageLocation extends BaseEntity {
  location_code: string;
  location_name: string;
  description: string | null;
  active: boolean;
}

export interface Product extends BaseEntity {
  barcode: string;
  sku: string | null;
  product_name: string;
  description: string | null;
  unit_id: string;
  price: number;
  cost: number;
  storage_location_id: string | null;
  min_stock_qty: number;
  active: boolean;
}

export interface UserProfile extends BaseEntity {
  auth_user_id: string;
  line_user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  role_id: string;
  active: boolean;
}

export interface StockMovement extends BaseEntity {
  movement_date: string;
  product_id: string;
  location_id: string;
  movement_type: MovementType;
  qty_in: number;
  qty_out: number;
  balance_qty: number;
  unit_cost: number;
  reference_type: string | null;
  reference_no: string | null;
  remark: string | null;
}
